import * as path from 'path';
import * as fs from 'fs-extra';
import { remote } from 'electron';
import * as git from 'isomorphic-git';
import * as yaml from 'js-yaml';
import { Publication } from 'renderer/app/lists/models';
import { OBIssue } from 'renderer/app/issues/models';
import { ITURecommendation } from 'renderer/app/recommendations/models';
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
  workspace: Workspace = {
    publications: {},
    recommendations: {},
    issues: {},
  };

  constructor(private fs: any, private workDir: string) {
    this.fs = fs;
    this.workDir = workDir;
  }

  public async loadWorkspace(): Promise<Workspace> {
    return {
      publications: await this.loadIndex<Publication>(PUBLICATIONS_ROOT),
      recommendations: await this.loadIndex<ITURecommendation>(REC_ROOT),
      issues: await this.loadIndex<OBIssue>(OB_ISSUE_ROOT),
    }
  }

  public async storeWorkspace(workspace: Workspace): Promise<boolean> {
    return this.storeIndex(workspace.issues);
  }

  private async loadIndex<O extends IndexableObject>(rootPath: string): Promise<Index<O>> {
    const dirs = await this.fs.readdir(path.join(this.workDir, rootPath));
    const items: Index<O> = {};

    for (const dir of dirs) {
      const item = (await this.loadObject(path.join(rootPath, dir))) as O;
      items[item.id] = item;
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
  private async loadObject(objDir: string): Promise<any> {
    let objData: {[propName: string]: any};

    const metaFile = path.join(this.workDir, objDir, 'meta.yaml');
    if ((await this.fs.stat(metaFile)).isFile()) {
      objData = await this.loadYAML(metaFile);
    } else {
      objData = {};
    }

    const dirContents = await this.fs.readdir(path.join(this.workDir, objDir));
    for (const item of dirContents) {
      if (path.extname(item) == YAML_EXT) {
        const basename = path.basename(item, YAML_EXT);
        if (basename != 'meta') {
          objData[basename] = await this.loadYAML(path.join(this.workDir, objDir, item));
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
      publication_date: obj.publication_date,
      cutoff_date: obj.cutoff_date,
    };
    await this.storeYAML(path.join(objPath, 'meta.yaml'), meta);
    await this.storeYAML(path.join(objPath, 'general.yaml'), obj.general);
    await this.storeYAML(path.join(objPath, 'amendments.yaml'), obj.amendments);
    await this.storeYAML(path.join(objPath, 'annexes.yaml'), obj.annexes);
    return obj;
  }

  private async loadYAML(filePath: string): Promise<any> {
    const data: string = await this.fs.readFile(filePath, { encoding: 'utf8' });
    return yaml.load(data);
  }

  private async storeYAML(filePath: string, data: any): Promise<any> {
    // Merge new data into old data; this way if some YAML properties
    // are not supported we will not lose them after the update.
    let fileExists: boolean;
    let oldData: any;
    try {
      fileExists = (await this.fs.stat(filePath)).isFile() === true;
    } catch (e) {
      fileExists = false;
    }
    if (fileExists) {
      oldData = await this.loadYAML(filePath);
    } else {
      oldData = {};
    }
    const newData: any = Object.assign({}, oldData, data);

    const newContents: string = yaml.dump(newData, { noRefs: true });

    console.debug(`Writing to ${filePath}, file exists: ${fileExists}`);

    // if (fileExists) {
    //   const oldContents: string = await this.fs.readFile(filePath, { encoding: 'utf8' });
    //   console.debug(`Replacing contents of ${filePath}`, oldContents, newContents);
    // }

    await this.fs.writeFile(filePath, newContents, { encoding: 'utf8' });
    return data;
  }
}


export async function initStorage(): Promise<Storage> {
  const userDataPath = remote.app.getPath('userData');
  const workDir = path.join(userDataPath, 'itu-ob-data');

  git.plugins.set('fs', fs);

  try {
    await fs.stat(path.join(workDir, '.git'));
  } catch (e) {
    await fs.remove(workDir);
    await fs.ensureDir(workDir);
    await git.clone({
      dir: workDir,
      corsProxy: 'https://cors.isomorphic-git.org',
      url: 'https://github.com/ituob/itu-ob-data',
      ref: 'master',
      singleBranch: true,
      depth: 10
    });
  }

  const storage = new Storage(fs, workDir);
  storage.workspace = await storage.loadWorkspace();
  return storage;
}
