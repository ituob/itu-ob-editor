import * as path from 'path';
import LightningFS from '@isomorphic-git/lightning-fs';
import * as git from 'isomorphic-git';
import * as yaml from 'js-yaml';
import { Publication, OBIssue } from './publications';


const PUBLICATIONS_ROOT = 'lists';
const OB_ISSUE_ROOT = 'issues';
const YAML_EXT = '.yaml';


interface IndexableObject { id: string | number, [key: string]: any }

interface Index<T extends IndexableObject> { [id: string]: T }

interface ArraySorter { (a: [string, unknown], b: [string, unknown]): number }

interface ObjectManagementOpts { order: ArraySorter | undefined }

export class QuerySet<T extends IndexableObject> {
  index: Index<T>;
  order: ArraySorter;
  items: [string, T][];
  _ordered: boolean;

  constructor(
      index: Index<T>,
      order: ArraySorter = sortAlphabeticallyAscending,
      items: [string, T][] | undefined = undefined,
      ordered = false) {
    this.index = index;
    this.items = items === undefined ? Object.entries(index) : items;
    this.order = order;
    this._ordered = ordered;
  }
  get(id: string): T {
    return this.index[id];
  }
  add(obj: T): void {
    this.index[obj.id] = obj;
  }
  orderBy(comparison: ArraySorter) {
    return new QuerySet(this.index, this.order, [...this.items].sort(comparison), true);
  }
  filter(func: (item: [string, T]) => boolean) {
    console.debug("Filtered:", this.items.filter(func));
    return new QuerySet(this.index, this.order, this.items.filter(func), this._ordered);
  }
  all() {
    return this._ordered
      ? this.items.map(item => item[1])
      : this.orderBy(this.order).items.map(item => item[1]);
  }
}

export class ItemManager<T extends IndexableObject> {
  index: Index<T>;
  items: QuerySet<T>;

  constructor(index: Index<T>, opts: ObjectManagementOpts = { order: undefined }) {
    this.index = index;
    this.items = new QuerySet<T>(index, opts.order);
  }
}

export interface WorkspaceState {
  publications: Index<Publication>,
  issues: Index<OBIssue>,
}


export class Workspace {
  fs: any;
  workDir: string;
  state: WorkspaceState = {
    publications: {},
    issues: {},
  };

  constructor(fs: any, workDir: string) {
    this.fs = fs;
    this.workDir = workDir;
  }

  static async init(): Promise<Workspace> {
    const w: Workspace = await initWorkspace();
    w.state = await w.loadState();
    return w;
  }

  async loadYAML(filePath: string): Promise<any> {
    const data: string = await this.fs.readFile(filePath, { encoding: 'utf8' });
    return yaml.load(data);
  }

  async storeYAML(filePath: string, data: any): Promise<any> {
    // Merge new data into old data; this way if some YAML properties
    // are not supported we will not lose them after the update.
    let fileExists: boolean;
    let oldData: any;
    try {
      fileExists = (await this.fs.stat(filePath)).type == 'file';
    } catch (e) {
      fileExists = false;
    }
    if (fileExists) {
      oldData = await this.loadYAML(filePath);
    } else {
      oldData = {};
    }
    const newData: any = Object.assign({}, oldData, data);

    const newContents: string = yaml.dump(newData);

    console.debug(`Writing to ${filePath}, file exists: ${fileExists}`);

    // if (fileExists) {
    //   const oldContents: string = await this.fs.readFile(filePath, { encoding: 'utf8' });
    //   console.debug(`Replacing contents of ${filePath}`, oldContents, newContents);
    // }

    await this.fs.writeFile(filePath, newContents, { encoding: 'utf8' });
    return data;
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

    // Blindly hope that data structure loaded from YAML
    // is valid for given type.
    return (objData as T);
  }

  async storeObject(obj: OBIssue): Promise<OBIssue> {
    const objDir = path.join(OB_ISSUE_ROOT, `${obj.id}`);
    const objPath = path.join(this.workDir, objDir);

    let pathExists: boolean;

    try {
      await this.fs.stat(objPath)
      pathExists = true;
    } catch (e) {
      pathExists = false;
    }
    if (!pathExists) {
      await this.fs.mkdir(objPath);
    }

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

  async loadState(): Promise<WorkspaceState> {
    return {
      publications: await this.loadIndex<Publication>(PUBLICATIONS_ROOT),
      issues: await this.loadIndex<OBIssue>(OB_ISSUE_ROOT),
    }
  }

  async storeState(state: WorkspaceState): Promise<boolean> {
    return this.storeIndex(state.issues);
  }

  async loadIndex<O extends IndexableObject>(rootPath: string): Promise<Index<O>> {
    const dirs = await this.fs.readdir(path.join(this.workDir, rootPath));
    const items: Index<O> = {};

    for (const dir of dirs) {
      const item = await this.loadObject<O>(path.join(rootPath, dir));
      items[item.id] = item;
    }
    return items;
  }

  async storeIndex(idx: Index<OBIssue>): Promise<boolean> {
    const items: OBIssue[] = Object.values(idx);
    for (const obj of items) {
      await this.storeObject(obj);
    }
    return true;
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



export const sortAlphabeticallyAscending: ArraySorter = function (a, b) {
  return a[0].localeCompare(b[0]);
}
export const sortIntegerDescending: ArraySorter = function (a: [string, unknown], b: [string, unknown]): number {
  return parseInt(b[0], 10) - parseInt(a[0], 10);
}
export const sortIntegerAscending: ArraySorter = function (a: [string, unknown], b: [string, unknown]): number {
  return parseInt(a[0], 10) - parseInt(b[0], 10);
}
