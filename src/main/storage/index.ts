import * as path from 'path';
import * as fs from 'fs-extra';
import * as git from 'isomorphic-git';

import { app } from 'electron';

import { YAMLStorage } from 'main/storage/yaml';
import { Publication } from 'main/lists/models';
import { OBIssue } from 'main/issues/models';
import { Message } from 'main/issues/messages';

import {
  isTelephoneService,
} from 'main/issues/messages';

import { ITURecommendation } from 'main/recommendations/models';

import { Index, IndexableObject } from './query';


const PUBLICATIONS_ROOT = 'lists';
const REC_ROOT = 'recommendations';
const YAML_EXT = '.yaml';


abstract class StoreManager<O extends IndexableObject> {
  private _index: Index<O> | undefined = undefined;

  constructor(public rootDir: string) {}

  public async storeIndex(storage: Storage, newIdx: Index<O> | undefined): Promise<boolean> {
    const idx: Index<O> = newIdx || await this.getIndex(storage);
    const items: O[] = Object.values(idx);

    for (const obj of items) {
      await this.store(obj, storage);
    }
    return true;
  };

  public async getIndex(storage: Storage): Promise<Index<O>> {
    if (this._index === undefined) {
      this._index = await this._loadIndex(storage);
    }
    return this._index;
  };

  private async _loadIndex(storage: Storage): Promise<Index<O>> {
    const rootPath = this.rootDir;
    const dirs = await storage.fs.readdir(path.join(storage.workDir, rootPath));
    const idx: Index<O> = {};

    for (const dir of dirs) {
      if (dir != '.DS_Store') {
        const objData = await storage.loadObject(path.join(rootPath, dir));
        if (objData) {
          const obj: O = this.postLoad(objData);
          idx[obj.id] = obj;
        }
      }
    }
    return idx;
  }

  // TODO: Use methods `toStoreableObject(obj: O) => any` & `toUseableObject(data: any) => O`
  // to prepare object for storage & post-process loaded data

  // Stores object in DB
  public abstract async store(obj: O, storage: Storage): Promise<boolean>;

  // Converts object data into valid object, if needed
  // (in cases when partial data is stored or migration took place previously)
  public postLoad(obj: any): O {
    return obj as O;
  };
}

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
      if (isTelephoneService(msg)) {
        if (!msg.contents.map) {
          console.warn(`Incompatible Telephone Service message contents type: ${obj.id}`);
          msg.contents = [];
        }
      }
      return msg;
    });

    if (!(obj.amendments || {}).messages) {
      obj.amendments = { messages: [] };
    }
    return obj;
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


export interface Workspace {
  publications: Index<Publication>,
  recommendations: Index<ITURecommendation>,
  issues: Index<OBIssue>,
}


export class Storage {
  public yaml: YAMLStorage;
  public workspace: Workspace;

  constructor(public fs: any, public workDir: string,
      public storeManagers: { [key: string]: StoreManager<any> }) {
    this.fs = fs;
    this.workDir = workDir;
    this.yaml = new YAMLStorage(fs);

    this.workspace = Object.keys(storeManagers).reduce((obj: any, key: string) => {
      obj[key] = {};
      return obj;
    }, {}) as Workspace;
  }

  public async loadWorkspace(): Promise<Workspace> {
    return {
      publications: await this.storeManagers.publications.getIndex(this),
      recommendations: await this.storeManagers.recommendations.getIndex(this),
      issues: await this.storeManagers.issues.getIndex(this),
    }
  }

  public async storeWorkspace(workspace: Workspace): Promise<boolean> {
    await this.storeManagers.issues.storeIndex(this, this.workspace.issues);
    this.workspace = await this.loadWorkspace();
    return true;
  }

  // Loads object data from given directory, reading YAML files.
  // meta.yaml is treated specially, populating top-level object payload.
  // Other YAML files populate corresponding object properties.
  public async loadObject(objDir: string): Promise<any | undefined> {
    let objData: {[propName: string]: any};

    const metaFile = path.join(this.workDir, objDir, 'meta.yaml');
    let metaFileIsFile: boolean;
    try {
      metaFileIsFile = (await this.fs.stat(metaFile)).isFile();
    } catch (e) {
      return undefined;
    }
    if (!metaFileIsFile) {
      return undefined;
    }
    objData = await this.yaml.load(metaFile);

    const dirContents = await this.fs.readdir(path.join(this.workDir, objDir));
    for (const item of dirContents) {
      if (path.extname(item) == YAML_EXT) {
        const basename = path.basename(item, YAML_EXT);
        if (basename != 'meta') {
          objData[basename] = await this.yaml.load(path.join(this.workDir, objDir, item));
        }
      }
    }

    // Blindly hope that data structure loaded from YAML
    // is valid for given type.
    return objData;
  }
}


export async function initStorage(): Promise<Storage> {
  const userDataPath = app.getPath('userData');
  const workDir = path.join(userDataPath, 'itu-ob-data');
  const repoUrl = 'https://github.com/ituob/itu-ob-data';
  const corsProxy = 'https://cors.isomorphic-git.org';

  git.plugins.set('fs', fs);

  let gitInitialized: boolean;

  try {
    gitInitialized = (await fs.stat(path.join(workDir, '.git'))).isDirectory();
  } catch (e) {
    gitInitialized = false;
  }

  if (gitInitialized === true) {
    await git.pull({
      dir: workDir,
      ref: 'master',
      singleBranch: true,
      fastForwardOnly: true,
    });

  } else {
    await fs.remove(workDir);
    await fs.ensureDir(workDir);
    await git.clone({
      dir: workDir,
      url: repoUrl,
      ref: 'master',
      singleBranch: true,
      depth: 10,
      corsProxy: corsProxy,
    });
  }

  const storage = new Storage(fs, workDir, {
    issues: new IssueManager(),
    publications: new PublicationManager(),
    recommendations: new RecommendationManager(),
  });
  storage.workspace = await storage.loadWorkspace();
  return storage;
}
