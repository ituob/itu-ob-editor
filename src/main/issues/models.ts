import { IndexableObject } from 'main/storage/query';
import { Message } from './messages';


export interface MessageBlock {
  messages: Message[],
}

export interface AnnexesBlock {
  [pubId: string]: { position_on: Date },
}

export interface ScheduledIssue extends IndexableObject {
  id: number,
  publication_date: Date,
  cutoff_date: Date,
}

export interface OBIssue extends IndexableObject {
  // Stored data
  id: number,
  publication_date: Date,
  cutoff_date: Date,
  general: MessageBlock,
  amendments: MessageBlock,
  annexes: AnnexesBlock,
}
