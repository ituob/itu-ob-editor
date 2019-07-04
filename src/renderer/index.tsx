import * as ReactDOM from 'react-dom';
import * as React from 'react';
import '!style-loader!css-loader!@blueprintjs/core/lib/css/blueprint.css';
import { App } from './app';
import { Workspace } from './app/workspace';
import * as styles from './styles.scss';


async function initApp() {
  document.body.classList.add(styles.bodyLoading);

  const ws = await Workspace.init();

  console.debug(window.location.search);
  ReactDOM.render(
    <App
      workspace={ws}
      qs={window.location.search}
      defaultLang={{ id: 'en', title: 'English' }}
      languages={[
        { id: 'en', title: 'English' },
        { id: 'ru', title: 'Russian' }]}
      />,
    document.getElementById('app'));

  document.body.classList.remove(styles.bodyLoading);
}
initApp();
