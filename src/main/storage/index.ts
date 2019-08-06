import * as path from 'path';
import * as fs from 'fs-extra';
import * as git from 'isomorphic-git';

import { app } from 'electron';

import { YAMLStorage } from 'main/storage/yaml';
import { Publication } from 'main/lists/models';
import { OBIssue } from 'main/issues/models';
import { ITURecommendation } from 'main/recommendations/models';

import { Index, IndexableObject } from './query';


const PUBLICATIONS_ROOT = 'lists';
const REC_ROOT = 'recommendations';
const OB_ISSUE_ROOT = 'issues';
const YAML_EXT = '.yaml';


export interface Workspace {
  publications: Index<Publication>,
  recommendations: Index<ITURecommendation>,
  issues: Index<OBIssue>,
}


export class Storage {
  yaml: YAMLStorage;

  workspace: Workspace = {
    publications: {},
    recommendations: {},
    issues: {},
  };

  constructor(private fs: any, private workDir: string) {
    this.fs = fs;
    this.workDir = workDir;
    this.yaml = new YAMLStorage(fs);
  }

  public async loadWorkspace(): Promise<Workspace> {
    return {
      publications: await this.loadIndex<Publication>(PUBLICATIONS_ROOT),
      recommendations: await this.loadIndex<ITURecommendation>(REC_ROOT),
      issues: await this.loadIssueIndex(),
    }
  }

  public async storeWorkspace(workspace: Workspace): Promise<boolean> {
    await this.storeIndex(workspace.issues);
    this.workspace = await this.loadWorkspace();
    return true;
  }

  private async loadIssueIndex(): Promise<Index<OBIssue>> {
    const issues: Index<OBIssue> = await this.loadIndex<OBIssue>(OB_ISSUE_ROOT);

    for (let [idx, issue] of Object.entries(issues)) {
      if (!(issue.general || {}).messages) {
        issue.general = { messages: [] };
      }
      if (!(issue.amendments || {}).messages) {
        issue.amendments = { messages: [] };
      }
      issues[idx] = Object.assign({}, issue);
    }
    return issues;
  }

  private async loadIndex<O extends IndexableObject>(rootPath: string): Promise<Index<O>> {
    const dirs = await this.fs.readdir(path.join(this.workDir, rootPath));
    const items: Index<O> = {};

    for (const dir of dirs) {
      if (dir != '.DS_Store') {
        const objData = await this.loadObject(path.join(rootPath, dir));
        if (objData) {
          items[objData.id] = objData as O;
        }
      }
    }
    return items;
  }

  private async storeIndex(idx: Index<OBIssue>): Promise<boolean> {
    const items: OBIssue[] = Object.values(idx);
    for (const obj of items) {
      await this.storeObject(obj);
    }
    return true;
  }

  // Loads object data from given directory, reading YAML files.
  // meta.yaml is treated specially, populating top-level object payload.
  // Other YAML files populate corresponding object properties.
  private async loadObject(objDir: string): Promise<any | undefined> {
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

  private async storeObject(obj: OBIssue): Promise<OBIssue> {
    const objDir = path.join(OB_ISSUE_ROOT, `${obj.id}`);
    const objPath = path.join(this.workDir, objDir);

    await this.fs.ensureDir(objPath);

    const meta = {
      id: obj.id,
      publication_date: new Date(obj.publication_date),
      cutoff_date: new Date(obj.cutoff_date),
    };
    await this.yaml.store(path.join(objPath, 'meta.yaml'), meta);
    await this.yaml.store(path.join(objPath, 'general.yaml'), obj.general);
    await this.yaml.store(path.join(objPath, 'amendments.yaml'), obj.amendments);
    await this.yaml.store(path.join(objPath, 'annexes.yaml'), obj.annexes);
    return obj;
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

  const storage = new Storage(fs, workDir);
  storage.workspace = await storage.loadWorkspace();
  return storage;
}
