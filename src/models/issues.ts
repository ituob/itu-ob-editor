import { IndexableObject } from 'sse/storage/query';
import { Message } from 'models/messages';


export interface MessageBlock {
  messages: Message[],
}

export interface AnnexesBlock {
  [pubId: string]: { position_on: Date },
}

export type OBMessageSection = 'amendments' | 'general';

export interface OBIssue extends IndexableObject {
  // Stored data
  id: number,
  publication_date: Date,
  cutoff_date: Date,
  general: MessageBlock,
  amendments: MessageBlock,
  annexes: AnnexesBlock,
}

export interface ScheduledIssue extends IndexableObject {
  // Trimmed down OBIssue, schedule only
  id: number,
  publication_date: Date,
  cutoff_date: Date,
}


interface Factories<M> {
  [factoryName: string]: (obj: M, ...params: any) => M,
}

export const issueFactories: Factories<OBIssue> = {

  withEditedMessage: (issue: OBIssue, section: OBMessageSection, msgIdx: number, updatedMessage: Message) => {
    var newMessages = [...issue[section].messages];
    newMessages[msgIdx] = updatedMessage;
    return { ...issue, [section]: {
      ...issue[section],
      messages: newMessages,
    }};
  },

  withAddedMessage: (issue: OBIssue, section: OBMessageSection, msgIdx: number, message: Message) => {
    var newMessages = [...issue[section].messages]; 
    newMessages.splice(msgIdx, 0, message);
    return { ...issue, [section]: {
      ...issue[section],
      messages: newMessages,
    }};
  },

  withRemovedMessage: (issue: OBIssue, section: OBMessageSection, msgIdx: number) => {
    var newMessages = [...issue[section].messages]; 
    newMessages.splice(msgIdx, 1);
    return { ...issue, [section]: {
      ...issue[section],
      messages: newMessages,
    }};
  },

};
