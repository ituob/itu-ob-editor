import * as ReactDOM from 'react-dom';
import React, { useState } from 'react';
import { NonIdealState } from '@blueprintjs/core';

import { LangConfigContext } from 'sse/localizer/renderer';
import { DataSynchronizer } from 'sse/storage/renderer/data-synchronizer';
import { request } from 'sse/api/renderer';
import { Index } from 'sse/storage/query';

import { RendererStorage } from 'storage/renderer';

import { HomeScreen } from './home';
import { Settings } from './settings';
import { Window as IssueEditor } from './issue-editor';
import { IssueScheduler } from './issue-scheduler';
import { PublicationEditor } from './publication-editor';
import { BatchCommit } from './widgets/batch-commit';
import { WorkspaceContext, StorageContextSpec, ModifiedObjectStatus } from './workspace-context';

import { OBIssue } from 'models/issues';
import { Publication } from 'models/publications';
import { ITURecommendation } from 'models/recommendations';
import { AvailableLanguages } from 'models/languages';

import '!style-loader!css-loader!@blueprintjs/datetime/lib/css/blueprint-datetime.css';
import '!style-loader!css-loader!@blueprintjs/core/lib/css/blueprint.css';
import '!style-loader!css-loader!./normalize.css';
import * as styles from './styles.scss';


/* TODO: Register pluggable things */


// Electron Webpack skeleton guarantees that #app exists in index.html
const appRoot = document.getElementById('app') as HTMLElement;

appRoot.classList.add(styles.app);
document.documentElement.classList.add(`platform--${process.platform}`);

const searchParams = new URLSearchParams(window.location.search);

const App: React.FC<{}> = function () {
  let component: JSX.Element;

  if (searchParams.get('c') === 'home') { 
    component = <HomeScreen />;

  } else if (searchParams.get('c') === 'issueScheduler') { 
    component = <IssueScheduler />;

  } else if (searchParams.get('c') === 'issueEditor') {
    component = <IssueEditor issueId={searchParams.get('issueId') || ''} />;

  } else if (searchParams.get('c') === 'publicationEditor') {
    component = <PublicationEditor
      publicationId={searchParams.get('pubId') || ''}
      create={searchParams.get('create') === '1'} />;

  } else if (searchParams.get('c') === 'dataSynchronizer') {
    component = <DataSynchronizer
      upstreamURL={searchParams.get('upstreamURL') || ''}
      inPreLaunchSetup={searchParams.get('inPreLaunchSetup') === '1'} />;

  } else if (searchParams.get('c') === 'settings') {
    component = <Settings />;

  } else if (searchParams.get('c') === 'batchCommit') {
    component = <BatchCommit />;

  } else {
    component = <NonIdealState
      icon="error"
      title="Unknown component requested" />;
  }

  const initWorkspace: StorageContextSpec<RendererStorage> = {
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
      const newCurrent = {
        issues: await request<Index<OBIssue>>('storage-read-all-issues'),
        publications: await request<Index<Publication>>('storage-read-all-publications'),
        recommendations: await request<Index<ITURecommendation>>('storage-read-all-recommendations'),
      };
      updateWorkspace(workspace => ({ ...workspace, current: newCurrent }));
    },
    refreshModified: async (hasLocalChanges) => {
      let modified: ModifiedObjectStatus<RendererStorage>;

      if (hasLocalChanges !== false) {
        const result = await Promise.all([
          await request<number[]>('storage-read-modified-in-issues'),
          await request<string[]>('storage-read-modified-in-publications'),
          await request<string[]>('storage-read-modified-in-recommendations'),
        ]);
        modified = {
          issues: result[0],
          publications: result[1],
          recommendations: result[2],
        };
      } else {
        modified = {
          issues: [],
          publications: [],
          recommendations: [],
        };
      }
      updateWorkspace(workspace => ({ ...workspace, modified }));
    },
  };
  const [workspace, updateWorkspace] = useState(initWorkspace);

  const [langConfig, setLangConfig] = useState({
    available: AvailableLanguages,
    default: 'en',
    selected: 'en',
    select: (langId: string) => {
      setLangConfig(langConfig => Object.assign({}, langConfig, { selected: langId }));
    },
  });

  return (
    <LangConfigContext.Provider value={langConfig}>
      <WorkspaceContext.Provider value={workspace}>
        {component}
      </WorkspaceContext.Provider>
    </LangConfigContext.Provider>
  );
};


ReactDOM.render(<App />, appRoot);
