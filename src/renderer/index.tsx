import * as ReactDOM from 'react-dom';
import * as React from 'react';

import { HomeScreen, IssueEditor, IssueScheduler } from './app';

import '!style-loader!css-loader!@blueprintjs/datetime/lib/css/blueprint-datetime.css';
import '!style-loader!css-loader!@blueprintjs/core/lib/css/blueprint.css';
import '!style-loader!css-loader!./normalize.css';
import * as styles from './styles.scss';


// Electron Webpack skeleton guarantees that #app exists in index.html
const app = document.getElementById('app') as HTMLElement;

app.classList.add(styles.app);

const searchParams = new URLSearchParams(window.location.search);

if (searchParams.get('c') === 'home') { 
  ReactDOM.render(
    <HomeScreen />,
    app);

} else if (searchParams.get('c') === 'issueScheduler') { 
  ReactDOM.render(
    <IssueScheduler />,
    app);

} else if (searchParams.get('c') === 'issueEditor') {
  ReactDOM.render(
    <IssueEditor issueId={searchParams.get('issueId') || ''} />,
    app);
}
