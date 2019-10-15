import { remote } from 'electron';
import React from 'react';
import { Label, InputGroup, Button } from '@blueprintjs/core';
import { useSetting } from 'sse/settings/renderer';

import * as styles from './repository-configurator.scss';


interface RepositoryConfiguratorProps {
  defaultUrl: string;
}
export const RepositoryConfigurator: React.FC<RepositoryConfiguratorProps> = function ({ defaultUrl }) {
  const url = useSetting<string>('gitRepoUrl', '');

  async function handleSaveAction() {
    await url.commit();
    remote.getCurrentWindow().hide();
  }

  return (
    <>
      <div className={styles.base}>
        <Label>
          Enter Git repository URL
          <InputGroup
            value={url.value}
            key="username"
            large={true}
            type="text"
            placeholder={defaultUrl}
            onChange={(evt: React.FormEvent<HTMLElement>) => {
              url.set((evt.target as HTMLInputElement).value as string);
            }}
          />
        </Label>

        <Button
            intent="primary"
            title="Confirm"
            disabled={url.value.trim() === '' && defaultUrl.trim() === ''}
            onClick={handleSaveAction}>
          {url.value.trim() !== '' ? "Save" : "Use default"}
        </Button>
      </div>
    </>
  );
};
