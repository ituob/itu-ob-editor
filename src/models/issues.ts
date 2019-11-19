import { IndexableObject } from 'sse/storage/query';
import { Message } from 'models/messages';


export interface MessageBlock {
  messages: Message[],
}

export interface AnnexesBlock {
  [pubId: string]: { position_on: Date } | null,
}

export type OBMessageSection = 'amendments' | 'general';

export type OBAnnexesSection = 'annexes';
export type OBSection = OBMessageSection | OBAnnexesSection;

export function isOBSection(val: string): val is OBSection {
  return ['amendments', 'general', 'annexes'].indexOf(val) >= 0;
}
export function isOBMessageSection(val: string): val is OBMessageSection {
  return ['amendments', 'general'].indexOf(val) >= 0;
}
export function isOBAnnexesSection(val: string): val is OBAnnexesSection {
  return val === 'annexes';
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

  withAddedAnnex: (issue: OBIssue, pubId: string) => {
    var newAnnexes = {...issue.annexes};
    newAnnexes[pubId] = null;
    return { ...issue, annexes: newAnnexes };
  },

  withDeletedAnnex: (issue: OBIssue, pubId: string) => {
    var newAnnexes = {...issue.annexes};
    delete newAnnexes[pubId];
    return { ...issue, annexes: newAnnexes };
  },

  withUpdatedAnnexedPublicationPosition: (issue: OBIssue, pubId: string, position: Date) => {
    var newAnnexes = {...issue.annexes};
    newAnnexes[pubId] = { position_on: position };
    return { ...issue, annexes: newAnnexes };
  },

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
