import * as ReactDOM from 'react-dom';
import React, { useState } from 'react';
import { NonIdealState } from '@blueprintjs/core';

import { LangConfigContext } from 'sse/localizer/renderer';
import { DataSynchronizer } from 'sse/storage/renderer/data-synchronizer';
import { Spotlight } from 'sse/spotlight/renderer';
import { Preflight } from 'sse/preflight/renderer';

import { HomeScreen } from './home';
import { IssueEditor } from './issue-editor';
import { IssueScheduler } from './issue-scheduler';
import { PublicationEditor } from './publication-editor';

import '!style-loader!css-loader!@blueprintjs/datetime/lib/css/blueprint-datetime.css';
import '!style-loader!css-loader!@blueprintjs/core/lib/css/blueprint.css';
import '!style-loader!css-loader!./normalize.css';
import * as styles from './styles.scss';


/* TODO: Register pluggable things */


// Electron Webpack skeleton guarantees that #app exists in index.html
const appRoot = document.getElementById('app') as HTMLElement;

appRoot.classList.add(styles.app);

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

  } else {
    component = <NonIdealState
      icon="error"
      title="Unknown component requested" />;
  }

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
      {component}
    </LangConfigContext.Provider>
  );
};


ReactDOM.render(<App />, appRoot);
