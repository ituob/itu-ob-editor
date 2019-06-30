import * as path from 'path';
import LightningFS from '@isomorphic-git/lightning-fs';
import * as git from 'isomorphic-git';
import * as yaml from 'js-yaml';
import { Publication, OBIssue } from './publications';


const PUBLICATIONS_ROOT = 'lists';
const OB_ISSUE_ROOT = 'issues';
const YAML_EXT = '.yaml';


export class Workspace {
  fs: any;
  workDir: string;

  constructor(fs: any, workDir: string) {
    this.fs = fs;
    this.workDir = workDir;
  }

  async loadYAML(filePath: string): Promise<any> {
    const data: string = await this.fs.readFile(filePath, { encoding: 'utf8' });
    return yaml.load(data);
  }

  // Loads object data from given directory, reading YAML files.
  // meta.yaml is treated specially, populating top-level object payload.
  // Other YAML files populate corresponding object properties.
  async loadObject<T>(objDir: string): Promise<T> {
    let objData: {[propName: string]: any};

    const metaFile = path.join(this.workDir, objDir, 'meta.yaml');
    if ((await this.fs.stat(metaFile)).type == 'file') {
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

    return (objData as T);
  }

  async getIssues(): Promise<OBIssue[]> {
    const dirs = await this.fs.readdir(path.join(this.workDir, OB_ISSUE_ROOT));
    const items: OBIssue[] = [];

    for (let dir of dirs) {
      const item = await this.loadObject<OBIssue>(path.join(OB_ISSUE_ROOT, dir));
      items.push(item);
    }
    return items;
  }

  async getPublications(): Promise<Publication[]> {
    const dirs = await this.fs.readdir(path.join(this.workDir, PUBLICATIONS_ROOT));
    const items: Publication[] = [];

    for (let dir of dirs) {
      const item = await this.loadObject<Publication>(path.join(PUBLICATIONS_ROOT, dir));
      items.push(item);
    }
    return items;
  }

  static async init() {
    return initWorkspace();
  }
}


async function initWorkspace(): Promise<Workspace> {
  const workDir = '/itu-ob-data';
  const fs: any = new LightningFS('fs', { wipe: true });

  git.plugins.set('fs', fs);

  const pfs: any = (fs.promises as any);

  await pfs.mkdir(workDir);
  await pfs.readdir(workDir);

  await git.clone({
    dir: workDir,
    corsProxy: 'https://cors.isomorphic-git.org',
    url: 'https://github.com/ituob/itu-ob-data',
    ref: 'master',
    singleBranch: true,
    depth: 10
  });

  return new Workspace(pfs, workDir);
}
