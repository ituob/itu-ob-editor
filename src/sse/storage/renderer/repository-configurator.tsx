import { remote, ipcRenderer } from 'electron';
import React, { useState } from 'react';
import { Label, InputGroup, Button } from '@blueprintjs/core';

import * as styles from './repository-configurator.scss';


interface RepositoryConfiguratorProps {
  defaultUrl: string;
  currentUrl: string;
}
export const RepositoryConfigurator: React.FC<RepositoryConfiguratorProps> = function ({ defaultUrl, currentUrl }) {
  const [newUrl, setNewUrl] = useState(currentUrl);

  async function handleSaveAction() {
    await ipcRenderer.send('set-setting', 'gitRepoUrl', newUrl.trim() || defaultUrl.trim());
    remote.getCurrentWindow().hide();
  }

  return (
    <>
      <div className={styles.base}>
        <Label>
          Enter Git repository URL
          <InputGroup
            value={newUrl}
            key="username"
            type="text"
            placeholder={defaultUrl}
            onChange={(evt: React.FormEvent<HTMLElement>) => {
              setNewUrl((evt.target as HTMLInputElement).value as string);
            }}
          />
        </Label>

        <Button
            intent="primary"
            title="Confirm"
            disabled={newUrl.trim() === '' && defaultUrl.trim() === ''}
            onClick={handleSaveAction}>
          {newUrl.trim() !== '' ? "Save" : "Use default"}
        </Button>
      </div>
    </>
  );
};
