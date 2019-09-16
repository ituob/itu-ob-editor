import { useReducer } from 'react';
import produce from 'immer';

const UNDO = Symbol('UNDO');
const REDO = Symbol('REDO');

// TODO: Decouple from storage!
// TODO 2: Move time travel into main and allow undoing/redoing through API endpoints
// (coupling with storage)
export function useTimeTravel(storeData, reducer, initialState) {
  const timeline = {
    past: [],
    present: initialState,
    future: []
  };
  const proxiedReducer = (tl, action) => {
    let newTimelineState;

    if (action === UNDO) {
      newTimelineState = _doUndo(tl);
    } else if (action === REDO) {
      newTimelineState = _doRedo(tl);
    } else {
      const newState = produce(tl.present, draft => reducer(draft, action));
      newTimelineState = _addNewPresent(tl, newState);
    }
    if (action.type !== 'FETCH_DATA' && storeData !== undefined) {
      storeData(newTimelineState.present);
    }
    return newTimelineState;
  };
  const [_timeline, _dispatch] = useReducer(proxiedReducer, timeline);
  return {
    state: _timeline.present,
    timeline: _timeline,
    dispatch: _dispatch,
    doUndo: () => _dispatch(UNDO),
    doRedo: () => _dispatch(REDO),
  };
}

function _addNewPresent(timeline, newPresent) {
  return produce(timeline, draft => {
    draft.past.push(draft.present);
    draft.present = newPresent;
    draft.future = [];
  });
}

function _doUndo(timeline) {
  return produce(timeline, draft => {
    if (!draft.past.length) return;
    const newPresent = draft.past.pop();
    draft.future.unshift(draft.present);
    draft.present = newPresent;
  });
}

function _doRedo(timeline) {
  return produce(timeline, draft => {
    if (!draft.future.length) return;
    const newPresent = draft.future.shift();
    draft.past.push(draft.present);
    draft.present = newPresent;
  });
}
