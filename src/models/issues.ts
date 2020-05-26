import { Message, MessageType } from 'models/messages';
import { AvailableLanguages } from 'models/languages';
import { Dataset } from 'models/dataset';


export interface MessageBlock {
  messages: Message[],
}

export interface AnnexesBlock {
  [pubId: string]: null | AnnexedPosition,
}

export interface PositionDatasets {
  [datasetId: string]: Dataset,
}

export interface AnnexedPosition {
  position_on: Date,
  // TODO: Migrate all annexes to the new structure and make datasets non-optional
  datasets?: PositionDatasets,
}

enum OBSections {
  amendments = 'amendments',
  general = 'general',
  annexes = 'annexes',
}
enum OBMessageSections {
  amendments = OBSections.amendments,
  general = OBSections.general,
}

export type OBMessageSection = keyof typeof OBMessageSections;
export type OBAnnexesSection = OBSections.annexes;
export type OBSection = keyof typeof OBSections;

export function isOBSection(val: string): val is OBSection {
  return [OBSections.amendments, OBSections.general, OBSections.annexes].map(s => `${s}`).indexOf(val) >= 0;
}
export function isOBMessageSection(val: string): val is OBMessageSection {
  return [OBSections.amendments, OBSections.general].map(s => `${s}`).indexOf(val) >= 0;
}
export function isOBAnnexesSection(val: string): val is OBAnnexesSection {
  return val === 'annexes';
}

export interface Contact {
  type: 'phone' | 'email' | 'fax',
  data: string,
  recommended?: boolean,
}

export interface OBAuthorOrg {
  address?: string,
  name?: string,
  // We’ll expect either address or name to be present.
  contacts: Contact[],
}

export interface ScheduledIssue {
  // Trimmed down OBIssue, schedule only
  id: number,
  publication_date: Date,
  cutoff_date: Date,
}

export interface IssueMeta {
  issn: string,
  authors: OBAuthorOrg[],
  languages: { [L in keyof typeof AvailableLanguages]?: true },
}

export interface IssueContents {
  general: MessageBlock,
  amendments: MessageBlock,
  annexes: AnnexesBlock,
}

export interface OBIssue extends ScheduledIssue, IssueMeta, IssueContents {}


interface Factories<M> {
  [factoryName: string]: (obj: M, ...params: any) => M,
}

export const GENERAL_MESSAGE_ORDER: MessageType[] = [
  'running_annexes',
  'approved_recommendations',
  'telephone_service',
  'telephone_service_2',
  'sanc',
  'iptn',
  'ipns',
  'mid',
  'org_changes',
  'misc_communications',
  'custom',
  'service_restrictions',
  'callback_procedures',
];

export const issueFactories: Factories<OBIssue> = {

  withAddedAnnex: (issue: OBIssue, pubId: string) => {
    var newAnnexes = {...issue.annexes || {}};
    newAnnexes[pubId] = null;
    return { ...issue, annexes: newAnnexes };
  },

  withDeletedAnnex: (issue: OBIssue, pubId: string) => {
    var newAnnexes = {...issue.annexes || {}};
    delete newAnnexes[pubId];
    return { ...issue, annexes: newAnnexes };
  },

  withUpdatedAnnexedPublicationPosition: (
      issue: OBIssue,
      pubId: string,
      position: AnnexedPosition | null) => {
    var newAnnexes = { ...issue.annexes };
    newAnnexes[pubId] = position;
    return { ...issue, annexes: newAnnexes };
  },

  withEditedMessage: (
      issue: OBIssue,
      section: OBMessageSection,
      msgIdx: number,
      updatedMessage: Message) => {
    var newMessages = [ ...issue[section].messages ];
    newMessages[msgIdx] = updatedMessage;
    return { ...issue, [section]: {
      ...issue[section],
      messages: newMessages,
    }};
  },

  withAddedMessage: (
      issue: OBIssue,
      section: OBMessageSection,
      message: Message) => {
    let idx: number;
    if (section === 'general') {
      idx = GENERAL_MESSAGE_ORDER.indexOf(message.type);
    } else {
      idx = issue[section].messages.length;
    }

    var newMessages = [ ...issue[section].messages ]; 
    newMessages.splice(idx, 0, message);
    return { ...issue, [section]: {
      ...issue[section],
      messages: newMessages,
    }};
  },

  withRemovedMessage: (
      issue: OBIssue,
      section: OBMessageSection,
      msgIdx: number) => {
    var newMessages = [ ...issue[section].messages ]; 
    newMessages.splice(msgIdx, 1);
    return { ...issue, [section]: {
      ...issue[section],
      messages: newMessages,
    }};
  },

};
