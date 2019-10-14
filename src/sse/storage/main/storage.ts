import * as path from 'path';

import { makeEndpoint } from 'sse/api/main';

import { Index, IndexableObject } from '../query';
import { Workspace } from '../workspace';

import { YAMLStorage } from './yaml';


const YAML_EXT = '.yaml';


export abstract class StoreManager<O extends IndexableObject> {
  private _index: Index<O> | undefined = undefined;

  constructor(public rootDir: string) {}

  public async storeIndex(storage: Storage<any>, newIdx: Index<O> | undefined): Promise<boolean> {
    const idx: Index<O> = newIdx || await this.getIndex(storage);
    const items: O[] = Object.values(idx);

    for (const obj of items) {
      await this.store(obj, storage);
    }

    this._index = idx;
    return true;
  }

  public async getIndex(storage: Storage<any>): Promise<Index<O>> {
    if (this._index === undefined) {
      this._index = await this._loadIndex(storage);
    }
    return this._index;
  }

  public async findObjects(storage: Storage<any>, query?: string): Promise<Index<O>> {
    const index = await this.getIndex(storage);
    if (query !== undefined) {
      var results: Index<O> = {};
      for (let key of Object.keys(index)) {
        const obj = index[key]
        if (this.objectMatchesQuery(obj, query)) {
          results[key] = obj;
        }
      }
      return results;
    } else {
      return index;
    }
  }

  private async _loadIndex(storage: Storage<any>): Promise<Index<O>> {
    const rootPath = this.rootDir;
    const dirs = await storage.fs.readdir(path.join(storage.workDir, rootPath));
    var idx: Index<O> = {};

    for (const dir of dirs) {
      if (dir != '.DS_Store') {
        const objData = await storage.loadObject(path.join(rootPath, dir));
        if (objData) {
          const obj: O = this.postLoad(objData);
          if (obj.id) {
            idx[obj.id] = obj;
          }
        }
      }
    }
    return idx;
  }

  // TODO: Use `toUseableObject(data: any) => O` to post-process loaded data

  // Stores object in DB
  public async store(obj: O, storage: Storage<any>): Promise<boolean> {
    const objDir = path.join(this.rootDir, `${obj.id}`);
    const objPath = path.join(storage.workDir, objDir);
    const storeable = this.toStoreableObject(obj);
    const idx = await this.getIndex(storage);

    await storage.fs.ensureDir(objPath);
    for (const key of Object.keys(storeable)) {
      await storage.yaml.store(path.join(objPath, `${key}.yaml`), storeable[key]);
    }

    idx[obj.id] = obj;
    this._index = idx;
    return true;
  }

  public toStoreableObject(obj: O): any {
    return { meta: obj as any };
  };

  // Converts object data into valid object, if needed
  // (in cases when partial data is stored or migration took place previously)
  public postLoad(obj: any): O {
    return obj as O;
  }

  public objectMatchesQuery(obj: O, query: string): boolean {
    return false;
  }
}


export abstract class Storage<W extends Workspace> {
  public yaml: YAMLStorage;
  public workspace: W;

  constructor(public fs: typeof import('fs-extra'), public workDir: string,
      public storeManagers: { [key: string]: StoreManager<any> }) {
    this.fs = fs;
    this.workDir = workDir;
    this.yaml = new YAMLStorage(fs);

    this.workspace = Object.keys(storeManagers).reduce((obj: any, key: string) => {
      obj[key] = {};
      return obj;
    }, {}) as W;
  }

  public abstract async findObjects(query?: string): Promise<W>

  public async loadWorkspace(): Promise<void> {
    this.workspace = await Object.keys(this.storeManagers).reduce(async (objP: Promise<any>, key: string) => {
      const obj = await objP;
      obj[key] = await this.storeManagers[key].getIndex(this);
      return obj;
    }, Promise.resolve({})) as W;
  }

  async storeWorkspace(): Promise<boolean> {
    return Promise.all([...Object.keys(this.storeManagers).map(async (key) => {
      return await this.storeManagers[key].storeIndex(this, this.workspace[key]);
    })]).then(() => true);
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

  setUpAPIEndpoints(notifier: (notify: string[]) => void) {
    for (let indexName of Object.keys(this.workspace)) {

      makeEndpoint<Index<any>>(`storage-${indexName}-all`, async () => {
        return this.workspace[indexName];
      }, async ({ newData, notify }) => {
        await this.storeManagers[indexName].storeIndex(this, newData);
        notifier([indexName, ...(notify || [])]);
      });

      makeEndpoint<IndexableObject>(`storage-${indexName}`, async ({ objectId }: { objectId: string }) => {
        return this.workspace[indexName][objectId];
      }, async ({ newData, notify }) => {
        await this.storeManagers[indexName].store(newData, this);
        notifier([indexName, ...(notify || [])]);
      });

      makeEndpoint<boolean>(`storage-${indexName}-delete`, async ({ objectId }: { objectId: string }) => {
        delete this.workspace[indexName][objectId];
        await this.storeManagers[indexName].storeIndex(this, this.workspace[indexName]);
        return true;
      });

    }
  }
}
