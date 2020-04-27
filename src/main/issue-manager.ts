import * as moment from 'moment';
import * as log from 'electron-log';

import { BehaviorSubject } from 'rxjs';
import { default as Manager } from 'coulomb/db/isogit-yaml/main/manager';
import { sortIntegerAscending, QuerySet, Index } from 'coulomb/db/query';
import { listen } from 'coulomb/ipc/main';
import { OBIssue, ScheduledIssue } from 'models/issues';
import { RunningAnnex, getRunningAnnexesForIssue } from 'models/running-annexes';


class IssueManager extends Manager<OBIssue, number, { onlyIDs?: number[], month?: Date }> {

  currentIssueID = new BehaviorSubject<number | null>(null);
  schedule: Index<ScheduledIssue> = {};
  runningAnnexes: Record<string, RunningAnnex[]> = {};

  async init() {
    const idx = await this.readAll({}, true);
    this.rebuildSchedule(idx);
    this.rebuildRunningAnnexes(idx);
  }

  rebuildRunningAnnexes(idx: Index<OBIssue>, forIssueID?: number) {
    for (const issueID of Object.keys(idx)) {
      this.runningAnnexes[issueID] =
        getRunningAnnexesForIssue(parseInt(issueID, 10), idx);
    }
  }

  getRunningAnnexes(asOfIssueID: number): RunningAnnex[] {
    return this.runningAnnexes[`${asOfIssueID}`];
  }

  getLatestAnnex(ofPubID: string, asOfIssueID: number): RunningAnnex | undefined {
    return (this.runningAnnexes[`${asOfIssueID}`] || []).
      filter(annex => annex.publicationID === ofPubID)[0];
  }

  rebuildSchedule(idx: Index<OBIssue>) {
    console.debug("schedule rebuild")

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

  async getCurrentIssueID() {
    const issues = new QuerySet<ScheduledIssue>(this.schedule);

    const currentIssue: ScheduledIssue | null = issues.filter(item => {
      return new Date(item[1].publication_date).getTime() >= new Date().getTime();
    }).orderBy(sortIntegerAscending).all()[0] || null;

    return currentIssue ? { id: currentIssue.id } : { id: null };
  }

  async scheduleIssue(obj: ScheduledIssue) {
    const result = await this.create(obj as OBIssue, `scheduled OB ${obj.id}`);
    await this.rebuildSchedule(await this.readAll({}, true));
    return result;
  }

  async getSchedule(query?: { month: Date | null }): Promise<Index<ScheduledIssue>> {
    console.debug("Getting schedule", query?.month);

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
      console.debug("Got:", filtered);
      return filtered;
    } else {
      return issues;
    }
  }


  public setUpIPC(modelName: string) {
    super.setUpIPC(modelName);
    const prefix = `model-${modelName}`;

    listen<{ obj: ScheduledIssue }, { success: true }>
    (`${prefix}-schedule-one`, async ({ obj }) => {
      await this.scheduleIssue(obj);
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