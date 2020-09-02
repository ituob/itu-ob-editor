import { useIPCValue } from '@riboseinc/coulomb/ipc/renderer';
import { RunningAnnex } from 'models/running-annexes';
import { conf } from '.';


type AnyDataType = keyof typeof conf["app"]["data"];


export function useModifiedIDs() {
  const modifiedIDs: { [K in AnyDataType]: string[] } =
    Object.keys(conf.app.data).map((key) => {
      return {
        [key]: useIPCValue<{}, string[]>(`model-${key}-read-uncommitted-ids`, []).value.map(i => `${i}`),
      };
    }).reduce((prevValue, currValue) => ({ ...prevValue, ...currValue }));

  return modifiedIDs;
}

export function useLatestAnnex(pubID: string, asOfIssueID: number): RunningAnnex | undefined {
  /* Returns RunningAnnex instance corresponding to position of publication with given pubId
     that was last annexed *before* OB edition with given issueId, or undefined if none is found. */

  return useIPCValue<{ pubID: string, asOfIssueID: number }, { annex: RunningAnnex | undefined }>
    ('model-issues-get-latest-annex', { annex: undefined }, { pubID, asOfIssueID }).value.annex;
}


export function useRunningAnnexes(asOfIssueID: number) {
  /* Returns running annexes up to and including OB edition with given issueId. */

  return useIPCValue<{ asOfIssueID: number }, { annexes: RunningAnnex[] }>
    ('model-issues-get-running-annexes', { annexes: [] }, { asOfIssueID }).value.annexes;
}
