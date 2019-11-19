/* Provides OB data throughout the app.
   The data is intended to be read only, no changes will get synced back to storage.
   Refresh method is provided to fetch new data from storage. */

// TODO: Move to SSE

import React, { useContext } from 'react';

import { Index } from 'sse/storage/query';
import { OBIssue } from 'models/issues';
import { Publication } from 'models/publications';
import { ITURecommendation } from 'models/recommendations';
import { RunningAnnex, getRunningAnnexesForIssue } from 'models/running-annexes';

import { Workspace } from 'main/storage';


export interface WorkspaceContextSpec {
  current: {
    issues: Index<OBIssue>,
    publications: Index<Publication>,
    recommendations: Index<ITURecommendation>,
  },
  refresh(): Promise<void>,
}

export const WorkspaceContext = React.createContext<WorkspaceContextSpec>({
  current: {
    issues: {},
    publications: {},
    recommendations: {},
  },
  refresh: async () => {},
});


export function useWorkspace(): Workspace {
  const workspace = useContext(WorkspaceContext);
  return workspace.current;
}


export function usePublication(id: string | undefined): Publication | undefined {
  if (!id) { return; }

  const ws = useWorkspace();
  return ws.publications[id];
}


export function useRecommendation(code: string | undefined): ITURecommendation | undefined {
  if (!code) { return; }

  const ws = useWorkspace();
  return ws.recommendations[code];
}


export function useLatestAnnex(issueId: number, pubId: string): RunningAnnex | undefined {
  const previousAnnexes = useRunningAnnexes(issueId, pubId);
  if (previousAnnexes.length > 0) {
    return previousAnnexes[0];
  }
  return;
}


export function useRunningAnnexes(issueId: number, pubId?: string) {
  const workspace = useWorkspace();
  return getRunningAnnexesForIssue(issueId, workspace.issues, workspace.publications, pubId);
}
