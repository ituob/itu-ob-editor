import { ipcRenderer } from 'electron';

import React, { useState, useEffect, useContext } from 'react';

import { RendererStorage as BaseRendererStorage } from 'sse/storage/renderer';
import { RemoteStorageStatus } from 'sse/storage/main/remote';
import { request } from 'sse/api/renderer';
import { Index } from 'sse/storage/query';

import { OBIssue } from 'models/issues';
import { Publication } from 'models/publications';
import { ITURecommendation } from 'models/recommendations';
import { RunningAnnex, getRunningAnnexesForIssue } from 'models/running-annexes';

import { Storage } from '.';


/* Context-consuming hooks */

export function useStorage(): RendererStorage {
  const storage = useContext(StorageContext);
  return storage.current;
}


export function useModified(): ModifiedObjectStatus<RendererStorage> {
  const storage = useContext(StorageContext);
  return storage.modified;
}


export function usePublication(id: string | undefined): Publication | undefined {
  if (!id) { return; }

  const storage = useStorage();
  return storage.publications[id];
}


export function useRecommendation(code: string | undefined): ITURecommendation | undefined {
  if (!code) { return; }

  const storage = useStorage();
  return storage.recommendations[code];
}


export function useLatestAnnex(issueId: number, pubId?: string): RunningAnnex | undefined {
  const previousAnnexes = useRunningAnnexes(issueId, pubId);
  if (previousAnnexes.length > 0) {
    return previousAnnexes[0];
  }
  return;
}


export function useRunningAnnexes(issueId: number, pubId?: string) {
  const storage = useStorage();
  return getRunningAnnexesForIssue(issueId, storage.issues, storage.publications, pubId);
}


/* Context provider */

export const StorageContextProvider: React.FC<{}> = function ({ children }) {

  const initStorage: StorageContextSpec<RendererStorage> = {
    current: {
      issues: {},
      publications: {},
      recommendations: {},
    },
    modified: {
      issues: [],
      publications: [],
      recommendations: [],
    },
    refresh: async () => {
      const results = await Promise.all([
        await request<Index<OBIssue>>('storage-read-all-issues'),
        await request<Index<Publication>>('storage-read-all-publications'),
        await request<Index<ITURecommendation>>('storage-read-all-recommendations'),
      ]);
      const newCurrent = {
        issues: results[0],
        publications: results[1],
        recommendations: results[2],
      };
      updateStorage(storage => ({ ...storage, current: newCurrent }));
    },
    refreshModified: async (hasLocalChanges) => {
      let modified: ModifiedObjectStatus<RendererStorage>;

      if (hasLocalChanges !== false) {
        const results = await Promise.all([
          await request<number[]>('storage-read-modified-in-issues'),
          await request<string[]>('storage-read-modified-in-publications'),
          await request<string[]>('storage-read-modified-in-recommendations'),
        ]);
        modified = {
          issues: results[0],
          publications: results[1],
          recommendations: results[2],
        };
      } else {
        modified = {
          issues: [],
          publications: [],
          recommendations: [],
        };
      }
      updateStorage(storage => ({ ...storage, modified }));
    },
  };

  const [storage, updateStorage] = useState(initStorage);

  useEffect(() => {
    storage.refresh();
    ipcRenderer.once('app-loaded', storage.refresh);
    ipcRenderer.on('publications-changed', storage.refresh);
    ipcRenderer.on('issues-changed', storage.refresh);

    storage.refreshModified();
    ipcRenderer.on('remote-storage-status', handleRemoteStorage);

    return function cleanup() {
      ipcRenderer.removeListener('app-loaded', storage.refresh);
      ipcRenderer.removeListener('publications-changed', storage.refresh);
      ipcRenderer.removeListener('issues-changed', storage.refresh);

      ipcRenderer.removeListener('remote-storage-status', handleRemoteStorage);
    };
  }, []);

  async function handleRemoteStorage(evt: any, remoteStorageStatus: Partial<RemoteStorageStatus>) {
    await storage.refreshModified(remoteStorageStatus.hasLocalChanges);
  }

  return <StorageContext.Provider value={storage}>{children}</StorageContext.Provider>;
};


/* Types */

export type RendererStorage = BaseRendererStorage<Storage>


// Of the form: { objType1: [id1, id2], objType2: [id3, id4] }
type ModifiedObjectStatus<R extends BaseRendererStorage<any>> = {
  [K in keyof R]: (string | number)[]
}


interface StorageContextSpec<R extends BaseRendererStorage<any>> {
  // Snapshot of all objects, per type
  current: R,
  refresh(): Promise<void>,

  // Snapshot of modified object IDs, per type
  modified: ModifiedObjectStatus<R>,
  refreshModified(hasLocalChanges?: boolean): Promise<void>,
}


const StorageContext = React.createContext<StorageContextSpec<RendererStorage>>({
  current: {
    issues: {},
    publications: {},
    recommendations: {},
  },
  refresh: async () => {},

  modified: {
    issues: [],
    publications: [],
    recommendations: [],
  },
  refreshModified: async () => {},
});
