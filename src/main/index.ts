import * as path from 'path';
import * as log from 'electron-log';
import { app as electronApp } from 'electron';

import { MainConfig } from 'coulomb/config/main';
import { initMain } from 'coulomb/app/main';

import { ManagerOptions } from 'coulomb/db/isogit-yaml/main/manager';
import { default as BackendCls } from 'coulomb/db/isogit-yaml/main/base';
import { default as ModelManagerCls } from 'coulomb/db/isogit-yaml/main/manager';

import { default as IssueManagerCls } from './issue-manager';

import { conf as appConf } from '../app';

import { OBIssue } from 'models/issues';
import { Publication } from 'models/publications';
import { ITURecommendation } from 'models/recommendations';


const appDataPath = electronApp.getPath('userData');


export const conf: MainConfig<typeof appConf> = {
  app: appConf,

  singleInstance: true,
  disableGPU: true,

  appDataPath: appDataPath,
  settingsFileName: 'ituob-settings',

  databases: {
    default: {
      backend: BackendCls,
      options: {
        workDir: path.join(appDataPath, 'ituob-data'),
        upstreamRepoURL: 'https://github.com/ituob/itu-ob-data',
        corsProxyURL: 'https://cors.isomorphic-git.org',
        fsWrapperClass: async () => await import('coulomb/db/isogit-yaml/main/yaml/directory'),
      },
    },
  },

  managers: {
    issues: {
      dbName: 'default',
      options: {
        cls: IssueManagerCls,
        workDir: 'issues',
        idField: 'id',
        metaFields: ['id', 'publication_date', 'cutoff_date', 'issn', 'languages', 'authors'],
      } as ManagerOptions<OBIssue>,
    },
    publications: {
      dbName: 'default',
      options: {
        cls: ModelManagerCls,
        workDir: 'lists',
        idField: 'id',
        metaFields: ['id', 'url', 'title', 'recommendation'],
      } as ManagerOptions<Publication>,
    },
    recommendations: {
      dbName: 'default',
      options: {
        cls: ModelManagerCls,
        workDir: 'recommendations',
        idField: 'id',
        metaFields: ['id', 'version', 'title'],
      } as ManagerOptions<ITURecommendation>,
    },
  },
};


export const app = initMain(conf);