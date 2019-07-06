import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { IssueScheduler, IssueEditor } from './app';
import { initStorage } from './app/storage';
import '!style-loader!css-loader!@blueprintjs/datetime/lib/css/blueprint-datetime.css';
import '!style-loader!css-loader!@blueprintjs/core/lib/css/blueprint.css';
import '!style-loader!css-loader!./normalize.css';


async function initWindow() {
  const searchParams = new URLSearchParams(window.location.search);
  const storage = await initStorage();

  if (searchParams.get('c') === 'issueScheduler') { 
    ReactDOM.render(
      <IssueScheduler
        storage={storage} />,
      document.getElementById('app'));

  } else if (searchParams.get('c') === 'issueEditor') {
    ReactDOM.render(
      <IssueEditor
        storage={storage}
        issueId={searchParams.get('issueId') || ''} />,
      document.getElementById('app'));
  }
}
initWindow();
