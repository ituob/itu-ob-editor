import { Message } from './messages';


export interface MessageBlock {
  messages: Message[],
}

interface AnnexBlock {
  [pubId: string]: string,
}

export interface OBIssue {
  id: number,
  publication_date: Date,
  cutoff_date: Date,
  general: MessageBlock,
  amendments: MessageBlock,
  annexes: AnnexBlock,
}

export { Message }
export { MessageType, ApprovedRecommendationsMessage, RunningAnnexesMessage } from './messages';
