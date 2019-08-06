import { OBIssue } from 'main/issues/models';


export function reducer(issue: OBIssue, action: any) {
  switch (action.type) {
    case 'FETCH_DATA':
      if (action.data !== null) {
        Object.assign(issue, action.data);
      }
      break;
    case 'ADD_GENERAL_MESSAGE':
      issue.general.messages.splice(action.newMessageIndex, 0, action.message);
      break;
    case 'EDIT_GENERAL_MESSAGE':
      issue.general.messages[action.messageIndex] = {
        ...issue.general.messages[action.messageIndex],
        ...action.messageData,
      };
      break;
    case 'REMOVE_GENERAL_MESSAGE':
      issue.general.messages.splice(action.messageIndex, 1);
      break;
    case 'REORDER_GENERAL_MESSAGE':
      issue.general.messages.splice(action.oldIndex, 1);
      issue.general.messages.splice(action.newIndex, 0, action.message);
      break;

    case 'ADD_AMENDMENT_MESSAGE':
      issue.amendments.messages.splice(action.newMessageIndex, 0, action.message);
      break;
    case 'EDIT_AMENDMENT_MESSAGE':
      issue.amendments.messages[action.messageIndex] = {
        ...issue.amendments.messages[action.messageIndex],
        ...action.messageData,
      };
      break;
    case 'REMOVE_AMENDMENT_MESSAGE':
      issue.amendments.messages.splice(action.messageIndex, 1);
      break;

    case 'ADD_RECOMMENDATION':
      break;

    case 'ADD_LIST':
      break;
  }
}
