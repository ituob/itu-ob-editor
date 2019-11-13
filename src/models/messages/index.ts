/* Various messages */

import { AmendmentMessage } from './amendment';
import { ServiceRestrictionsMessage } from './service_restrictions';
import { ApprovedRecommendationsMessage } from './approved_recommendations';
import { RunningAnnexesMessage } from './running_annexes';
import { TelephoneServiceMessage } from './telephone_service';
import { TelephoneServiceMessageV2 } from './telephone_service_2';
import { CustomMessage } from './custom';

export interface CallbackProceduresMessage {
  type: "callback_procedures",
}


/* The One Message Type */

export type Message =
  ApprovedRecommendationsMessage |
  RunningAnnexesMessage |
  TelephoneServiceMessage |
  TelephoneServiceMessageV2 |
  ServiceRestrictionsMessage |
  CallbackProceduresMessage |
  AmendmentMessage |
  CustomMessage;

export type MessageType = Message["type"]


// TODO: Below is ripe of duplication, could use some generics magic


export function isApprovedRecommendations(msg: Message): msg is ApprovedRecommendationsMessage {
  return msg.type === 'approved_recommendations';
}
export function isServiceRestrictions(msg: Message): msg is ServiceRestrictionsMessage {
  return msg.type === 'service_restrictions';
}
export function isRunningAnnexes(msg: Message): msg is RunningAnnexesMessage {
  return msg.type === 'running_annexes';
}
export function isTelephoneService(msg: Message): msg is TelephoneServiceMessage {
  return msg.type === 'telephone_service';
}
export function isTelephoneServiceV2(msg: Message): msg is TelephoneServiceMessageV2 {
  return msg.type === 'telephone_service_2';
}
export function isCallbackProcedures(msg: Message): msg is AmendmentMessage {
  return msg.type === 'callback_procedures';
}
export function isCustom(msg: Message): msg is CustomMessage {
  return msg.type === 'custom';
}
export function isAmendment(msg: Message): msg is AmendmentMessage {
  return msg.type === 'amendment';
}


export function getMessageTitle(msg: Message): string {
  if (isApprovedRecommendations(msg)) {
    return "Approved Recommendations";
  } else if (isRunningAnnexes(msg)) {
    return "Lists Annexed";
  } else if (isTelephoneServiceV2(msg)) {
    return "Telephone Service";
  } else if (isTelephoneService(msg)) {
    return "Telephone Service (old)";
  } else if (isCallbackProcedures(msg)) {
    return "Call-back and Alternative Calling Procedures";
  } else if (isCustom(msg)) {
    return "Custom message";
  } else if (isAmendment(msg)) {
    return `Amd. to ${((msg as AmendmentMessage).target || {}).publication}`;
  } else if (isServiceRestrictions(msg)) {
    return "Service Restrictions";
  } else {
    return msg.type;
    //throw new Error(`Unknown message type: ${msg.type}`);
  }
}


export {
  ApprovedRecommendationsMessage,
  TelephoneServiceMessage,
  TelephoneServiceMessageV2,
  AmendmentMessage,
  RunningAnnexesMessage,
}
