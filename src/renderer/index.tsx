import * as ReactDOM from 'react-dom';
import React, { useState } from 'react';
import { NonIdealState } from '@blueprintjs/core';

import { LangConfigContext } from 'sse/localizer/renderer';
import { DataSynchronizer } from 'sse/storage/renderer/data-synchronizer';
import { Spotlight } from 'sse/spotlight/renderer';
import { Preflight } from 'sse/preflight/renderer';

import { HomeScreen } from './home';
import { Settings } from './settings';
import { IssueEditor } from './issue-editor';
import { IssueScheduler } from './issue-scheduler';
import { PublicationEditor } from './publication-editor';
import { WelcomeConfigScreen } from './welcome';

import { WorkspaceContext } from './workspace-context';
import { request } from 'sse/api/renderer';
import { Index } from 'sse/storage/query';
import { OBIssue } from 'models/issues';
import { Publication } from 'models/publications';
import { ITURecommendation } from 'models/recommendations';

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
    component = <PublicationEditor publicationId={searchParams.get('pubId') || ''} />;

  } else if (searchParams.get('c') === 'dataSynchronizer') {
    component = <DataSynchronizer />;

  } else if (searchParams.get('c') === 'spotlight') {
    component = <Spotlight />;

  } else if (searchParams.get('c') === 'preflight') {
    component = <Preflight />;

  } else if (searchParams.get('c') === 'welcomeConfig') {
    component = <WelcomeConfigScreen defaultRepoUrl={searchParams.get('defaultRepoUrl') || ''} />;

  } else if (searchParams.get('c') === 'settings') {
    component = <Settings />;

  // } else if (searchParams.get('c') === 'migrationAssistant') {
  //   component = <MigrationAssistant />;

  } else {
    component = <NonIdealState
      icon="error"
      title="Unknown component requested" />;
  }

  const [workspace, updateWorkspace] = useState({
    current: {
      issues: {},
      publications: {},
      recommendations: {},
    },
    refresh: async () => {
      const newCurrent = {
        issues: await request<Index<OBIssue>>('storage-get-all-issues'),
        publications: await request<Index<Publication>>('storage-get-all-publications'),
        recommendations: await request<Index<ITURecommendation>>('storage-get-all-recommendations'),
      };
      updateWorkspace(workspace => ({ ...workspace, current: newCurrent }));
    },
  });

  const [langConfig, setLangConfig] = useState({
    available: { en: 'English', zh: 'Chinese', ru: 'Russian' },
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
