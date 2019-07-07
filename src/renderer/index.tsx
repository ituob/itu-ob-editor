import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { IssueScheduler, IssueEditor } from './app';
import { initStorage } from './app/storage';
import '!style-loader!css-loader!@blueprintjs/datetime/lib/css/blueprint-datetime.css';
import '!style-loader!css-loader!@blueprintjs/core/lib/css/blueprint.css';
import '!style-loader!css-loader!./normalize.css';
import * as styles from './styles.scss';


async function initWindow() {
  const searchParams = new URLSearchParams(window.location.search);
  const storage = await initStorage();

  // Electron Webpack skeleton guarantees that #app exists in index.html
  const app = document.getElementById('app') as HTMLElement;

  app.classList.add(styles.app);

  if (searchParams.get('c') === 'issueScheduler') { 
    ReactDOM.render(
      <IssueScheduler
        storage={storage} />,
      app);

  } else if (searchParams.get('c') === 'issueEditor') {
    ReactDOM.render(
      <IssueEditor
        storage={storage}
        issueId={searchParams.get('issueId') || ''} />,
      app);
  }
}
initWindow();
