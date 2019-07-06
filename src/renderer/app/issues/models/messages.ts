import { PublicationID } from 'renderer/app/lists/models';
import { ITURecVersion } from 'renderer/app/recommendations/models';


export interface ApprovedRecommendationsMessage {
  type: "approved_recommendations",
  items: { [code: string]: ITURecVersion },
}

export interface RunningAnnexesMessage {
  type: "running_annexes",
  extra_links: PublicationID[],
}

export type Message =
  ApprovedRecommendationsMessage |
  RunningAnnexesMessage;

export type MessageType = Message["type"]

type ExcludeTypeKey<K> = K extends "type" ? never : K;

export type ExtractMessageProperties<M, T> = M extends { type: T }
  ? ExcludeTypeKey<M>
  : never;
