import * as moment from 'moment';
import * as log from 'electron-log';

import { default as Manager } from 'coulomb/db/isogit-yaml/main/manager';
import { sortIntegerAscending, QuerySet, Index } from 'coulomb/db/query';
import { listen } from 'coulomb/ipc/main';
import { OBIssue, ScheduledIssue, IssueMeta, PositionDatasets, patchDatasets } from 'models/issues';
import { RunningAnnex, getRunningAnnexesForIssue, getAmendments } from 'models/running-annexes';
import { defaultLanguage, defaultISSN } from '../app';
import { DatasetChanges } from 'models/messages/amendment';


const PUBLICATION_META_PATH = 'defaults/issue';


class IssueManager extends Manager<OBIssue, number, { onlyIDs?: number[], month?: Date }> {

  schedule: Index<ScheduledIssue> = {};
  runningAnnexes: Record<string, RunningAnnex[]> = {};

  async init() {
    await this.rebuildIndexes();
  }

  async rebuildIndexes() {
    let idx: Index<OBIssue> | null;
    try {
      idx = await this.readAll({}, true);
    } catch (e) {
      idx = null;
    }
    if (idx) {
      this.rebuildSchedule(idx);
      this.rebuildRunningAnnexes(idx);
    }
  }

  rebuildRunningAnnexes(idx: Index<OBIssue>, forIssueID?: number) {
    if (forIssueID) {
      this.runningAnnexes[forIssueID] =
        getRunningAnnexesForIssue(forIssueID, idx);
    } else {
      for (const issueID of Object.keys(idx)) {
        this.runningAnnexes[issueID] =
          getRunningAnnexesForIssue(parseInt(issueID, 10), idx);
      }
    }
  }

  getRunningAnnexes(asOfIssueID: number): RunningAnnex[] {
    return this.runningAnnexes[`${asOfIssueID}`];
  }

  // TODO: excluding is unused and bad
  getLatestAnnex(ofPubID: string, asOfIssueID: number, excluding = false): RunningAnnex | undefined {
    return (this.runningAnnexes[`${asOfIssueID}`] || []).
      filter(annex => annex.publicationID === ofPubID)[excluding ? 1 : 0];
  }

  // TODO: Super slow!
  async getDatasetChanges(forPubID: string, asOfIssueID: number): Promise<DatasetChanges> {
    const latestAnnex = this.getLatestAnnex(forPubID, asOfIssueID);
    if (!latestAnnex) {
      log.warn("Issue manager: Couldn’t fetch latest annex", forPubID, asOfIssueID)
      return {};
    }

    const latestAnnexedDatasets = latestAnnex?.annexedTo.annexes[forPubID]?.datasets;
    if (latestAnnexedDatasets === undefined) {
      log.warn("Issue manager: Couldn’t fetch dataset amendment changes", forPubID, asOfIssueID)
      return {};
    }

    const amendments = getAmendments(
      forPubID,
      latestAnnex.annexedTo.id,
      asOfIssueID,
      await this.readAll({}, true));

    const amendmentsWithChanges = amendments.filter(amd => {
      return amd.datasetChanges !== undefined;
    })

    var changes: DatasetChanges = {};
    for (const dsID of Object.keys(latestAnnexedDatasets)) {
      changes[dsID] = { contents: [] };

      for (const amd of amendmentsWithChanges) {
        changes[dsID].contents = [ ...changes[dsID].contents, ...(amd.datasetChanges![dsID]?.contents || []) ];
      }
    }

    return changes;
  }

  async autoFillDatasets(forPubID: string, asOfIssueID: number): Promise<PositionDatasets | undefined> {
    const latestAnnex = this.getLatestAnnex(forPubID, asOfIssueID);

    if (latestAnnex !== undefined) {
      const latestDatasets = latestAnnex.annexedTo.annexes[forPubID]?.datasets;

      if (latestDatasets !== undefined) {
        const datasets = patchDatasets(
          latestDatasets,
          await this.getDatasetChanges(forPubID, asOfIssueID));

        if (Object.keys(datasets).length > 0) {
          return datasets;
        }
      }
    }
    return undefined;
  }

  rebuildSchedule(idx: Index<OBIssue>) {
    this.schedule = Object.values(idx).
      map(item => ({ [item.id]: {
        id: item.id,
        publication_date: item.publication_date,
        cutoff_date: item.cutoff_date,
      }})).
      reduce((prevValue, currValue) => ({ ...prevValue, ...currValue }));
  }

  public async readAll(_: { onlyIDs?: number[], month?: Date }, force?: true) {
    if (!force) {
      log.error("Cannot read all issues, too much data. Read schedule and individual issues instead.")
      return {};
    }

    return super.readAll();
  }

  public async update(objID: number, newData: OBIssue, commit: boolean | string = false) {
    await super.update(objID, newData, commit);
    await this.rebuildSchedule(await this.readAll({}, true));
    await this.reportUpdatedData([objID]);
  }

  public async delete(objID: number, commit: boolean | string = false) {
    await super.delete(objID, commit);
    await this.rebuildSchedule(await this.readAll({}, true));
    await this.reportUpdatedData([objID]);
  }

  async getCurrentIssueID() {
    const issues = new QuerySet<ScheduledIssue>(this.schedule);

    const currentIssue: ScheduledIssue | null = issues.filter(item => {
      return new Date(item[1].publication_date).getTime() >= new Date().getTime();
    }).orderBy(sortIntegerAscending).all()[0] || null;

    return currentIssue ? { id: currentIssue.id } : { id: null };
  }

  async savePublicationMeta(data: IssueMeta) {
    await this.db.update(PUBLICATION_META_PATH, data, ['issn', 'languages', 'authors']);
  }

  async scheduleIssue(obj: ScheduledIssue) {
    let publicationMeta: IssueMeta;
    try {
      publicationMeta = await this.db.read(PUBLICATION_META_PATH, ['issn', 'languages', 'authors']) as IssueMeta;
    } catch (e) {
      log.error("ITU OB: Failed to read publication meta, using defaults");
      publicationMeta = {
        languages: { [defaultLanguage]: true },
        authors: [],
        issn: defaultISSN,
      };
    }

    const full: OBIssue = {
      general: { messages: [] },
      amendments: { messages: [] },
      annexes: {},
      languages: publicationMeta.languages,
      authors: publicationMeta.authors,
      issn: publicationMeta.issn,
      ...obj,
    };

    const result = await this.create(full, `scheduled OB ${obj.id}`);
    const idx = await this.readAll({}, true);
    await this.rebuildSchedule(idx);
    await this.rebuildRunningAnnexes(idx, obj.id);
    return result;
  }

  async getSchedule(query?: { month: Date | null }): Promise<Index<ScheduledIssue>> {
    const issues = this.schedule;
    const month = query?.month;

    if (month) {
      const filtered = Object.values(issues).
        filter(item => {
          return (
            moment(item.publication_date).isSame(month, 'month') ||
            moment(item.cutoff_date).isSame(month, 'month'));
        }).
        map(item => ({ [item.id]: item })).
        reduce((prevVal, curVal) => ({ ...prevVal, ...curVal }), {});
      return filtered;
    } else {
      return issues;
    }
  }

  protected getObjID(dbRef: string) {
    const objID = super.getObjID(dbRef) as unknown as string;
    return parseInt(objID, 10);
  }


  public setUpIPC(modelName: string) {
    super.setUpIPC(modelName);
    const prefix = `model-${modelName}`;

    listen<{ obj: ScheduledIssue }, { success: true }>
    (`${prefix}-schedule-one`, async ({ obj }) => {
      await this.scheduleIssue(obj);
      return { success: true };
    });

    listen<{ obj: IssueMeta }, { success: true }>
    (`${prefix}-save-defaults`, async ({ obj }) => {
      await this.savePublicationMeta(obj);
      return { success: true };
    });

    listen<{ month: Date | null }, Index<ScheduledIssue>>
    (`${prefix}-get-schedule`, async ({ month }) => {
      return await this.getSchedule({ month });
    });

    listen<{ pubID: string, asOfIssueID: number, excluding: boolean }, { annex: RunningAnnex | null }>
    (`${prefix}-get-latest-annex`, async ({ pubID, asOfIssueID, excluding }) => {
      return { annex: this.getLatestAnnex(pubID, asOfIssueID, excluding) || null };
    });

    listen<{ forPubID: string, asOfIssueID: number }, { changes: DatasetChanges }>
    (`${prefix}-get-dataset-changes`, async ({ forPubID, asOfIssueID }) => {
      return { changes: await this.getDatasetChanges(forPubID, asOfIssueID) };
    });

    listen<{ forPubID: string, asOfIssueID: number }, { datasets?: PositionDatasets }>
    (`${prefix}-auto-fill-datasets`, async ({ forPubID, asOfIssueID }) => {
      return { datasets: await this.autoFillDatasets(forPubID, asOfIssueID) };
    });

    listen<{ asOfIssueID: number }, { annexes: RunningAnnex[] }>
    (`${prefix}-get-running-annexes`, async ({ asOfIssueID }) => {
      return { annexes: this.getRunningAnnexes(asOfIssueID) };
    });

    listen<{}, { id: number | null }>(`${prefix}-get-current-issue-id`, async () => {
      return await this.getCurrentIssueID();
    });
  }
}

export default IssueManager;