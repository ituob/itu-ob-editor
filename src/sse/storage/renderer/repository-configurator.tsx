import { URL } from 'url';
import { remote } from 'electron';
import React from 'react';
import { FormGroup, InputGroup, Button } from '@blueprintjs/core';
import { useSetting } from 'sse/settings/renderer';


interface RepositoryConfiguratorProps {
  defaultUrl: string;
  className: string;
}
export const RepositoryConfigurator: React.FC<RepositoryConfiguratorProps> = function ({ defaultUrl, className }) {
  const url = useSetting<string>('gitRepoUrl', '');

  async function handleSaveAction() {
    await url.commit();
    remote.getCurrentWindow().hide();
  }

  let urlIsValid: boolean;

  if (url.value.trim() === '') {
    // It’s optional
    urlIsValid = true;
  } else {
    try {
      new URL(url.value);
      urlIsValid = true;
    } catch (e) {
      console.error(e);
      urlIsValid = false;
    }
  }

  return (
    <>
      <div className={className}>
        <FormGroup
            key="url"
            label="Repository URL"
            helperText="Please enter a valid URL of the repository you have commit access to, or leave empty to use upstream."
            intent={urlIsValid ? "primary" : "danger"}>
          <InputGroup
            value={url.value}
            key="username"
            large={true}
            type="url"
            placeholder={defaultUrl}
            onChange={(evt: React.FormEvent<HTMLElement>) => {
              url.set((evt.target as HTMLInputElement).value as string);
            }}
          />
        </FormGroup>

        <Button
            className="confirm-button"
            key="confirm"
            intent={url.value.trim() !== '' ? "primary" : "warning"}
            large={true}
            disabled={(url.value.trim() === '' && defaultUrl.trim() === '') || urlIsValid !== true}
            onClick={handleSaveAction}>
          {url.value.trim() !== '' ? "Launch with this repository URL" : "Launch with upstream repository"}
        </Button>
      </div>
    </>
  );
};
