import { PublicationID } from 'renderer/app/lists/models';
import { ITURecVersion } from 'renderer/app/recommendations/models';


export interface AmendmentTarget {
  publication: PublicationID,
  position_on: string | undefined,
}

export interface ApprovedRecommendationsMessage {
  type: "approved_recommendations",
  items: { [code: string]: ITURecVersion },
}
export interface RunningAnnexesMessage {
  type: "running_annexes",
  extra_links: PublicationID[],
}
export interface AmendmentMessage {
  type: "amendment",
  target: AmendmentTarget,
  contents: any,
}
export interface CustomMessage {
  type: "custom",
  contents: any,
}
export interface TelephoneServiceMessage {
  type: "telephone_service",
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
