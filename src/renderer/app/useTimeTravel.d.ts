/// <reference types="node" />

import { WorkspaceState } from './workspace';

export function useTimeTravel(workspace: any, reducer: any, initialState: any): any

export interface TimeTravel {
  state: WorkspaceState,
  dispatch: any,
  timeline: any,
  doUndo: any,
  doRedo: any,
}
