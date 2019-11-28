import * as ReactDOM from 'react-dom';
import React, { useState } from 'react';
import { NonIdealState } from '@blueprintjs/core';

import { LangConfigContext } from 'sse/localizer/renderer';
import { DataSynchronizer } from 'sse/storage/renderer/data-synchronizer';

import { StorageContextProvider } from 'storage/renderer';

import { HomeScreen } from './home';
import { Settings } from './settings';
import { Window as IssueEditor } from './issue-editor';
import { IssueScheduler } from './issue-scheduler';
import { PublicationEditor } from './publication-editor';
import { BatchCommit } from './widgets/batch-commit';

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
      <StorageContextProvider>
        {component}
      </StorageContextProvider>
    </LangConfigContext.Provider>
  );
};


ReactDOM.render(<App />, appRoot);
