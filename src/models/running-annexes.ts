import { Index, QuerySet, sortIntegerAscending, sortIntegerDescending } from 'sse/storage/query';

import { Publication } from 'models/publications';
import { OBIssue } from 'models/issues';


export interface RunningAnnex {
  publication: Publication,
  annexedTo: OBIssue,
  positionOn: Date | null,
}


export function getRunningAnnexesForIssue(
    issueId: number,
    issueIndex: Index<OBIssue>,
    publicationIndex: Index<Publication>,
    onlyForPublicationID?: string): RunningAnnex[] {

  /* Given issue ID, runs through preceding issues and builds a list
     of annexed publications up to that issue.
     Optionally, selects only given publication ID.

     This is useful when determining the state of “Lists Annexed”
     at the beginning of an issue,
     or to check the last annexed position of a publication.

     Annexes are returned in order of newest to oldest issue. */

  const _pastIssues = new QuerySet<OBIssue>(issueIndex).
    orderBy(sortIntegerAscending).
    filter((item: [string, OBIssue]) => item[1].id < issueId);

  const pastIssues = _pastIssues.orderBy(sortIntegerDescending).all();

  var runningAnnexes: RunningAnnex[] = [];

  for (const pastIssue of pastIssues) {
    const annexes = Object.entries(pastIssue.annexes || {});
    for (const [annexedPublicationId, annexedPublicationPosition] of annexes) {

      if (onlyForPublicationID && annexedPublicationId !== onlyForPublicationID) {
        continue;
      }

      const pub = publicationIndex[annexedPublicationId];

      if (pub && runningAnnexes.find(ann => ann.publication.id == pub.id) === undefined) {
        const position = annexedPublicationPosition;
        runningAnnexes.push({
          publication: pub as Publication,
          annexedTo: pastIssue,
          positionOn: position ? (position.position_on as Date) : null,
        });
      }

    }
  }

  return runningAnnexes;
}
