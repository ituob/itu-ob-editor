import * as ReactDOM from 'react-dom';
import * as React from 'react';
import '!style-loader!css-loader!@blueprintjs/core/lib/css/blueprint.css';
import '!style-loader!css-loader!@blueprintjs/datetime/lib/css/blueprint-datetime.css';
import { IssueScheduler } from './app/issue-scheduler';
import { IssueEditor } from './app/issue-editor';
import { initWorkspace } from './app/workspace';


async function initWindow() {
  const searchParams = new URLSearchParams(window.location.search);
  const workspace = await initWorkspace();

  if (searchParams.get('c') === 'issueScheduler') { 
    ReactDOM.render(
      <IssueScheduler
        workspace={workspace} />,
      document.getElementById('app'));

  } else if (searchParams.get('c') === 'issueEditor') {
    ReactDOM.render(
      <IssueEditor
        workspace={workspace}
        issueId={searchParams.get('issueId') || ''} />,
      document.getElementById('app'));
  }

}
initWindow();
