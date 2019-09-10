import { obMessageTypeRegistry } from 'main';

import {
  MessageModel as AmendmentMessage,
  msgType as amendmentMsgPlugin,
} from './amendment';

import {
  MessageModel as ApprovedRecommendationsMessage,
  msgType as approvedRecommendationsMsgPlugin,
} from './approved_recommendations';

import {
  MessageModel as RunningAnnexesMessage,
  msgType as runningAnnexesMsgPlugin,
} from './running_annexes';

import {
  MessageModel as TelephoneServiceMessage,
  msgType as telephoneServiceMsgPlugin,
} from './telephone_service';

import {
  MessageModel as TelephoneService2Message,
  msgType as telephoneService2MsgPlugin,
} from './telephone_service_2';


const msgTypePlugins = [
  amendmentMsgPlugin,
  approvedRecommendationsMsgPlugin,
  runningAnnexesMsgPlugin,
  telephoneServiceMsgPlugin,
  telephoneService2MsgPlugin,
];

for (let plugin of msgTypePlugins) {
  obMessageTypeRegistry.register('running_annexes', plugin);
}


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
  TelephoneService2Message |
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
