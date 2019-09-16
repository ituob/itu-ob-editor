import * as path from 'path';
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

  public async store(obj: OBIssue, storage: Storage): Promise<boolean> {
    const objDir = path.join(this.rootDir, `${obj.id}`);
    const objPath = path.join(storage.workDir, objDir);

    await storage.fs.ensureDir(objPath);

    const meta = {
      id: obj.id,
      publication_date: new Date(obj.publication_date),
      cutoff_date: new Date(obj.cutoff_date),
    };
    await storage.yaml.store(path.join(objPath, 'meta.yaml'), meta);
    await storage.yaml.store(path.join(objPath, 'general.yaml'), obj.general);
    await storage.yaml.store(path.join(objPath, 'amendments.yaml'), obj.amendments);
    await storage.yaml.store(path.join(objPath, 'annexes.yaml'), obj.annexes);

    return true;
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

  public async store(obj: Publication, storage: Storage): Promise<boolean> {
    return false;
  }
}


class RecommendationManager extends StoreManager<ITURecommendation> {
  constructor() {
    super(REC_ROOT);
  }

  public async store(obj: ITURecommendation, storage: Storage): Promise<boolean> {
    return false;
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
  public async loadWorkspace(): Promise<Workspace> {
    return {
      publications: await this.storeManagers.publications.getIndex(this),
      recommendations: await this.storeManagers.recommendations.getIndex(this),
      issues: await this.storeManagers.issues.getIndex(this),
    };
  }
  public async storeWorkspace(workspace: Workspace): Promise<boolean> {
    await this.storeManagers.issues.storeIndex(this, this.workspace.issues);
    this.workspace = await this.loadWorkspace();
    return true;
  }
}


// NOTE: Depends on repository being initialized (`initRepo()` should resolve prior)
export async function initStorage(workDir: string): Promise<Storage> {
  const storage = new Storage(fs, workDir, {
    issues: new IssueManager(),
    publications: new PublicationManager(),
    recommendations: new RecommendationManager(),
  });

  storage.workspace = await storage.loadWorkspace();

  return storage;
}
