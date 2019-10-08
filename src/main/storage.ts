import * as fs from 'fs-extra';

import { StoreManager, Storage as BaseStorage } from 'sse/storage/main/storage';
import { Workspace as BaseWorkspace } from 'sse/storage/workspace';
import { Index } from 'sse/storage/query';

import { OBIssue } from 'models/issues';
import { Message } from 'models/messages';
import { ITURecommendation } from 'models/recommendations';
import { Publication } from 'models/publications';


const PUBLICATIONS_ROOT = 'lists';
const REC_ROOT = 'recommendations';


// TODO: Move to sub-module under main/issues, and subsequent managers similarly
export class IssueManager extends StoreManager<OBIssue> {
  constructor() {
    super('issues');
  }

  public toStoreableObject(obj: OBIssue): any {
    return {
      meta: {
        id: obj.id,
        publication_date: new Date(obj.publication_date),
        cutoff_date: new Date(obj.cutoff_date),
      },
      general: obj.general,
      amendments: obj.amendments,
      annexes: obj.annexes,
    };
  }

  public postLoad(obj: any): OBIssue {
    if (!(obj.general || {}).messages) {
      obj.general = { messages: [] };
    }

    obj.general.messages = obj.general.messages.map((msg: Message) => {
      // Validate issue messages. TODO (#10): Make part of message plugin definition.
      // if (isTelephoneServiceV2(msg)) {
      //   if (!msg.contents.map) {
      //     console.warn(`Incompatible Telephone Service message contents type: ${obj.id}`);
      //     msg.contents = [];
      //   }
      // }
      return msg;
    });

    if (!(obj.amendments || {}).messages) {
      obj.amendments = { messages: [] };
    }
    return obj;
  }

  public objectMatchesQuery(obj: OBIssue, query: string) {
    return `${obj.id}` === query.trim();
  }
}


class PublicationManager extends StoreManager<Publication> {
  constructor() {
    super(PUBLICATIONS_ROOT);
  }
}


class RecommendationManager extends StoreManager<ITURecommendation> {
  constructor() {
    super(REC_ROOT);
  }
}


export interface Workspace extends BaseWorkspace {
  publications: Index<Publication>,
  recommendations: Index<ITURecommendation>,
  issues: Index<OBIssue>,
}

export class Storage extends BaseStorage<Workspace> {
  public async findObjects(query?: string): Promise<Workspace> {
    return {
      publications: await this.storeManagers.publications.findObjects(this, query),
      recommendations: await this.storeManagers.recommendations.findObjects(this, query),
      issues: await this.storeManagers.issues.findObjects(this, query),
    };
  }
}


// NOTE: Depends on repository being initialized (`initRepo()` should resolve prior)
export async function initStorage(workDir: string): Promise<Storage> {
  const storage = new Storage(fs, workDir, {
    issues: new IssueManager(),
    publications: new PublicationManager(),
    recommendations: new RecommendationManager(),
  });

  await storage.loadWorkspace();

  return storage;
}
