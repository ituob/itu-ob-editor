/* Various messages */

import { Message as AmendmentMessage } from './amendment';
import { Message as RunningAnnexesMessage } from './running_annexes';
import { Message as ApprovedRecommendationsMessage } from './approved_recommendations';
import { Message as TelephoneServiceMessage } from './telephone_service';
import { Message as TelephoneServiceMessageV2 } from './telephone_service_2';
import { Message as SANCMessage } from './sanc';
import { Message as IPTNMessage } from './iptn';
import { Message as IPNSMessage } from './ipns';
import { Message as MIDMessage } from './mid';
import { Message as OrgChangesMessage } from './org_changes';
import { Message as MiscCommunicationsMessage } from './misc_communications';
import { Message as ServiceRestrictionsMessage } from './service_restrictions';
import { Message as CustomMessage } from './custom';

interface CallbackProceduresMessage {
  type: "callback_procedures",
}


/* The One Message Type */

export type Message =
  AmendmentMessage |
  RunningAnnexesMessage |
  ApprovedRecommendationsMessage |
  TelephoneServiceMessage |
  TelephoneServiceMessageV2 |
  SANCMessage |
  IPTNMessage |
  IPNSMessage |
  MIDMessage |
  OrgChangesMessage |
  MiscCommunicationsMessage |
  ServiceRestrictionsMessage |
  CallbackProceduresMessage |
  CustomMessage;

export type MessageType = Message["type"];


// TODO: Ripe of duplication, could use some generics magic

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
export function isFreeform(msg: Message): boolean {
  return ['sanc', 'iptn', 'ipns', 'mid', 'misc_communications', 'org_changes'].indexOf(msg.type) >= 0;
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
    return "Call-back and Alt. Calling Procedures";
  } else if (type === 'custom') {
    return "Custom";
  } else if (type === 'amendment') {
    return  "Amendment";
  } else if (type === 'service_restrictions') {
    return "Service Restrictions";
  } else if (type === 'mid') {
    return "Maritime Identification Digits";
  } else if (type === 'sanc') {
    return "Assignment of Signalling Area/Network Codes (SANC)";
  } else if (type === 'iptn') {
    return "The International Public Telecommunication Numbering Plan";
  } else if (type === 'ipns') {
    return "International Identification Plan for Public Networks and Subscriptions";
  } else if (type === 'org_changes') {
    return "Changes in Administrations/ROAs and other entities or Organizations";
  } else if (type === 'misc_communications') {
    return "Misc. communications";
  } else {
    return type;
    //throw new Error(`Unknown message type: ${msg.type}`);
  }
}


export {
  AmendmentMessage,
  RunningAnnexesMessage,
  ApprovedRecommendationsMessage,
  TelephoneServiceMessage,
  TelephoneServiceMessageV2,
  SANCMessage,
  IPTNMessage,
  IPNSMessage,
  MIDMessage,
  OrgChangesMessage,
  MiscCommunicationsMessage,
  ServiceRestrictionsMessage,
  CallbackProceduresMessage,
  CustomMessage,
}
