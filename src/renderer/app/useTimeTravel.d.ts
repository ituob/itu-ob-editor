/// <reference types="node" />

export function useTimeTravel(
  storeData: (...args: string[]) => void,
  reducer: any,
  initialState: any): any

export interface TimeTravel {
  state: any,
  dispatch: any,
  timeline: any,
  doUndo: any,
  doRedo: any,
}
