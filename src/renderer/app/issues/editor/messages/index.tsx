import {
  Message,
  MessageType,
  AmendmentMessage,
} from 'models/messages';


// TODO: Refactor these; amendment title should be publication
export function getMessageTypeTitle(type: MessageType): string {
  if (type === 'approved_recommendations') {
    return  "Approved Recommendations";
  } else if (type === 'running_annexes') {
    return "Lists Annexed";
  } else if (type === 'telephone_service_2') {
    return "Telephone Service";
  } else if (type === 'telephone_service') {
    return "Telephone Service";
  } else if (type === 'callback_procedures') {
    return "Call-back and Alternative Calling Procedures";
  } else if (type === 'custom') {
    return "Custom";
  } else if (type === 'amendment') {
    return  "Amendment";
  } else if (type === 'service_restrictions') {
    return "Service Restrictions";
  } else {
    return type;
    //throw new Error(`Unknown message type: ${msg.type}`);
  }
}
export function getMessageSubtitle(msg: Message): string | undefined {
  if (msg.type === 'amendment') {
    return `to ${((msg as AmendmentMessage).target || {}).publication}`;
  } else if (msg.type === 'telephone_service') {
    return "(old)";
  }
  return undefined;
}
