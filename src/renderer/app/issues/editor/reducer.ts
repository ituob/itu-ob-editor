import { Workspace } from 'renderer/app/storage';


export function reducer(state: Workspace, action: any) {
  switch (action.type) {
    case 'ADD_GENERAL_MESSAGE':
      if (state.issues[action.id]) {
        state.issues[action.id].general.messages.splice(action.newMessageIndex, 0, action.message);
      }
      break;
    case 'EDIT_GENERAL_MESSAGE':
      if (state.issues[action.id]) {
        state.issues[action.id].general.messages[action.messageIndex] = {
          ...state.issues[action.id].general.messages[action.messageIndex],
          ...action.messageData,
        };
      }
      break;
    case 'REMOVE_GENERAL_MESSAGE':
      if (state.issues[action.id]) {
        state.issues[action.id].general.messages.splice(action.messageIndex, 1);
      }
      break;
    case 'REORDER_GENERAL_MESSAGE':
      if (state.issues[action.id]) {
        state.issues[action.id].general.messages.splice(action.oldIndex, 1);
        state.issues[action.id].general.messages.splice(action.newIndex, 0, action.message);
      }
      break;

    case 'ADD_AMENDMENT_MESSAGE':
      if (state.issues[action.id]) {
        state.issues[action.id].amendments.messages.splice(action.newMessageIndex, 0, action.message);
      }
      break;
    case 'EDIT_AMENDMENT_MESSAGE':
      if (state.issues[action.id]) {
        state.issues[action.id].amendments.messages[action.messageIndex] = {
          ...state.issues[action.id].amendments.messages[action.messageIndex],
          ...action.messageData,
        };
      }
      break;
    case 'REMOVE_AMENDMENT_MESSAGE':
      if (state.issues[action.id]) {
        state.issues[action.id].amendments.messages.splice(action.messageIndex, 1);
      }
      break;

    case 'ADD_RECOMMENDATION':
      break;

    case 'ADD_LIST':
      break;
  }
}
