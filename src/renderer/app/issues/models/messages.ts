export interface ApprovedRecommendationsMessage {
  type: "approved_recommendations",
  items: { [code: string]: string },
}

export interface RunningAnnexesMessage {
  type: "running_annexes",
}

export type Message =
  ApprovedRecommendationsMessage |
  RunningAnnexesMessage;

export type MessageType = Message["type"]

type ExcludeTypeKey<K> = K extends "type" ? never : K;

export type ExtractMessageProperties<M, T> = M extends { type: T }
  ? ExcludeTypeKey<M>
  : never;
