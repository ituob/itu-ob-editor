import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { App } from './app';
import { Workspace } from './app/workspace';
import * as styles from './styles.scss';

async function initApp() {
  document.body.classList.add(styles.bodyLoading);

  const ws = await Workspace.init();

  ReactDOM.render(
    <App
      workspace={ws}
      defaultLang={{ id: 'en', title: 'English' }}
      languages={[
        { id: 'en', title: 'English' },
        { id: 'ru', title: 'Russian' }]}
      />,
    document.getElementById('app'));

  document.body.classList.remove(styles.bodyLoading);
}
initApp();
