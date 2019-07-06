/// <reference types="node" />

import { Workspace, Storage } from './storage';

export function useTimeTravel(storage: Storage, reducer: any, initialState: Workspace): any

export interface TimeTravel {
  state: Workspace,
  dispatch: any,
  timeline: any,
  doUndo: any,
  doRedo: any,
}
