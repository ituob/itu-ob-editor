import * as moment from 'moment';
import * as log from 'electron-log';

import { default as Manager } from 'coulomb/db/isogit-yaml/main/manager';
import { sortIntegerAscending, QuerySet, Index } from 'coulomb/db/query';
import { listen } from 'coulomb/ipc/main';
import { OBIssue, ScheduledIssue, IssueMeta, PositionDatasets } from 'models/issues';
import { RunningAnnex, getRunningAnnexesForIssue } from 'models/running-annexes';
import { defaultLanguage, defaultISSN } from '../app';


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

  getLatestAnnex(ofPubID: string, asOfIssueID: number): RunningAnnex | undefined {
    return (this.runningAnnexes[`${asOfIssueID}`] || []).
      filter(annex => annex.publicationID === ofPubID)[0];
  }

  autoFillDatasets(forPubID: string, asOfIssueID: number): PositionDatasets | undefined {
    const latestAnnex = this.getLatestAnnex(forPubID, asOfIssueID);

    if (latestAnnex !== undefined) {
      const latestDatasets = latestAnnex.annexedTo.annexes[forPubID]?.datasets;

      if (latestDatasets !== undefined) {
        var datasets: PositionDatasets = {};
        for (const [datasetID, dataset] of Object.entries(latestDatasets)) {
          datasets[datasetID] = {
            meta: dataset.meta,

            // TODO: Apply amendments during dataset auto-fill \^o^/
            contents: dataset.contents,
          };
        }

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

    listen<{ pubID: string, asOfIssueID: number }, { annex: RunningAnnex | undefined }>
    (`${prefix}-get-latest-annex`, async ({ pubID, asOfIssueID }) => {
      return { annex: this.getLatestAnnex(pubID, asOfIssueID) };
    });

    listen<{ forPubID: string, asOfIssueID: number }, { datasets?: PositionDatasets }>
    (`${prefix}-auto-fill-datasets`, async ({ forPubID, asOfIssueID }) => {
      return { datasets: this.autoFillDatasets(forPubID, asOfIssueID) };
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