import { ipcRenderer } from 'electron';
import React from 'react';
import { Button } from '@blueprintjs/core';
import * as styles from './styles.scss';


export const Settings: React.FC<{}> = function () {

  async function handleReset() {
    await ipcRenderer.send('clear-app-data');
  }

  return (
    <div className={styles.settingsBase}>
      <Button large={true} intent="danger" onClick={handleReset}>Reset application data</Button>
    </div>
  );
};
