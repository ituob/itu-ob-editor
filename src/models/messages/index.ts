/* Various messages */

import { AmendmentMessage } from './amendment';
import { ServiceRestrictionsMessage } from './service_restrictions';
import { ApprovedRecommendationsMessage } from './approved_recommendations';
import { RunningAnnexesMessage } from './running_annexes';
import { TelephoneServiceMessage } from './telephone_service';
import { TelephoneServiceMessageV2 } from './telephone_service_2';

export interface CustomMessage {
  type: "custom",
  contents: any,
}

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
    return "Custom message";
  } else if (type === 'amendment') {
    // TODO: Amendment title should be the publication?
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


export {
  ApprovedRecommendationsMessage,
  TelephoneServiceMessage,
  TelephoneServiceMessageV2,
  AmendmentMessage,
  RunningAnnexesMessage,
}
