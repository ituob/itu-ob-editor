import { Message } from './messages';


export interface MessageBlock {
  messages: Message[],
}

export interface AnnexesBlock {
  [pubId: string]: { position_on: Date },
}

export interface ScheduledIssue {
  id: number,
  publication_date: Date,
  cutoff_date: Date,
}

export interface OBIssue {
  // Stored data
  id: number,
  publication_date: Date,
  cutoff_date: Date,
  general: MessageBlock,
  amendments: MessageBlock,
  annexes: AnnexesBlock,
}

export { Message }
export {
  MessageType,
  ExcludeTypeField,
  ApprovedRecommendationsMessage,
  RunningAnnexesMessage,
  AmendmentMessage,
  AmendmentTarget,
} from './messages';
