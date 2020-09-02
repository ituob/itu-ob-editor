import { Index, QuerySet, sortIntegerAscending, sortIntegerDescending } from '@riboseinc/coulomb/db/query';
import { OBIssue } from 'models/issues';
import { AmendmentMessage } from './messages';


export interface RunningAnnex {
  publicationID: string,
  annexedTo: OBIssue,
  positionOn: Date | null,
}


export function getRunningAnnexesForIssue(
    asOfIssueID: number,
    issueIndex: Index<OBIssue>,
    onlyForPublicationID?: string): RunningAnnex[] {

  /* Given issue ID, runs through preceding issues and builds a list
     of annexed publications up to and including that issue.
     Optionally, selects only given publication ID.

     This is useful when determining the state of “Lists Annexed”
     at the beginning of an issue,
     or to check the last annexed position of a publication.

     Annexes are returned in order of newest to oldest issue. */

  const _pastIssues = new QuerySet<OBIssue>(issueIndex).
    orderBy(sortIntegerAscending).
    filter((item: [string, OBIssue]) => item[1].id <= asOfIssueID);

  const pastIssues = _pastIssues.orderBy(sortIntegerDescending).all();

  var runningAnnexes: RunningAnnex[] = [];

  for (const pastIssue of pastIssues) {
    const annexes = Object.entries(pastIssue.annexes || {});
    for (const [annexedPublicationId, annexedPublicationPosition] of annexes) {

      if (onlyForPublicationID && annexedPublicationId !== onlyForPublicationID) {
        continue;
      }

      if (runningAnnexes.find(ann => ann.publicationID === annexedPublicationId) === undefined) {
        const position = annexedPublicationPosition;
        runningAnnexes.push({
          publicationID: annexedPublicationId,
          annexedTo: pastIssue,
          positionOn: position ? (position.position_on as Date) : null,
        });
      }

    }
  }

  return runningAnnexes;
}


export function getAmendments(
    forPublicationID: string,
    afterIssueID: number,
    asOfIssueID: number,
    issueIndex: Index<OBIssue>): AmendmentMessage[] {

  /* Given issue ID, runs through preceding issues and builds a list
     of annexed publications up to and including that issue.
     Optionally, selects only given publication ID.

     This is useful when determining the state of “Lists Annexed”
     at the beginning of an issue,
     or to check the last annexed position of a publication.

     Annexes are returned in order of newest to oldest issue. */

  const _pastIssues = new QuerySet<OBIssue>(issueIndex).
    orderBy(sortIntegerAscending).
    filter((item: [string, OBIssue]) => item[1].id <= asOfIssueID && item[1].id > afterIssueID);

  const pastIssues = _pastIssues.orderBy(sortIntegerAscending).all();

  var msgs: AmendmentMessage[] = [];

  for (const pastIssue of pastIssues) {
    const amendments: AmendmentMessage[] = (pastIssue.amendments?.messages as AmendmentMessage[]) || [];

    for (const amd of amendments) {
      if (amd.target.publication !== forPublicationID) {
        continue;
      }
      msgs.push(amd);
    }
  }

  return msgs;
}
