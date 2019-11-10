import { ipcRenderer } from 'electron';
import React from 'react';
import { Button } from '@blueprintjs/core';
import * as styles from './styles.scss';


const isMacOS = process.platform === 'darwin';


export const Settings: React.FC<{}> = function () {

  async function handleReset() {
    await ipcRenderer.send('clear-app-data');
  }

  async function handleDevtools() {
    await ipcRenderer.send('launch-devtools');
  }

  return (
    <div className={styles.settingsBase}>
      {!isMacOS
        ? <Button minimal={true} large={true} onClick={handleDevtools}>Enable DevTools in open windows</Button>
        : null}
      {isMacOS
        ? <Button minimal={true} small={true} intent="danger" onClick={handleReset}>Reset application data</Button>
        : null}
    </div>
  );
};
