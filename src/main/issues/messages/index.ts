import { AmendmentMessage } from './amendment';
import { ApprovedRecommendationsMessage } from './approved_recommendations';
import { RunningAnnexesMessage } from './running_annexes';
import { TelephoneServiceMessage } from './telephone_service';


export interface CustomMessage {
  type: "custom",
  contents: any,
}

export interface ServiceRestrictionsMessage {
  type: "service_restrictions",
  items: { country: string, ob: number, page: number }[],
}

export interface CallbackProceduresMessage {
  type: "callback_procedures",
}

export type Message =
  ApprovedRecommendationsMessage |
  RunningAnnexesMessage |
  TelephoneServiceMessage |
  ServiceRestrictionsMessage |
  CallbackProceduresMessage |
  AmendmentMessage |
  CustomMessage;

export type MessageType = Message["type"]

type ExcludeTypeKey<K> = K extends "type" ? never : K;

export type ExcludeTypeField<M> = { [K in ExcludeTypeKey<keyof M>]: M[K] }

export type ExtractMessageProperties<M, T> = M extends { type: T }
  ? ExcludeTypeField<M>
  : never;



// TODO: Turn those functions into one generic function
export function isApprovedRecommendations(msg: Message): msg is ApprovedRecommendationsMessage {
  return msg.type === 'approved_recommendations';
}
export function isRunningAnnexes(msg: Message): msg is RunningAnnexesMessage {
  return msg.type === 'running_annexes';
}
export function isTelephoneService(msg: Message): msg is TelephoneServiceMessage {
  return msg.type === 'telephone_service';
}
export function isAmendment(msg: Message): msg is AmendmentMessage {
  return msg.type === 'amendment';
}


export {
  ApprovedRecommendationsMessage,
  TelephoneServiceMessage,
  AmendmentMessage,
  RunningAnnexesMessage,
}
