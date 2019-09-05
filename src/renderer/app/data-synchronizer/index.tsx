import { ipcRenderer } from 'electron';
import React, { useState } from 'react';
import { Card, Label, InputGroup, FormGroup, TextArea, Callout, UL, Button } from '@blueprintjs/core';

import { GitAuthor } from 'main/storage/git';
import { useWorkspaceRO } from 'renderer/app/storage/api';
import { useLocalStorage } from 'renderer/app/useLocalStorage';

import * as styles from './styles.scss';


const API_ENDPOINT = 'fetch-commit-push';


interface DataSynchronizerProps {}
export const DataSynchronizer: React.FC<DataSynchronizerProps> = function () {
  const [username, setUsername] = useLocalStorage('gitUsername', '');
  const [password, setPassword] = useLocalStorage('gitPassword', '');

  const [commitMsg, setCommitMsg] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');

  const cfgAuthor = useWorkspaceRO<GitAuthor>('git-author-info', {});

  if (authorName === '' && cfgAuthor.name !== undefined) { setAuthorName(cfgAuthor.name); }
  if (authorEmail === '' && cfgAuthor.email !== undefined) { setAuthorEmail(cfgAuthor.email); }

  const [errors, setErrors] = useState([] as string[]);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);

  function handleResult(evt: any, rawData: string) {
    ipcRenderer.removeListener(`workspace-${API_ENDPOINT}`, handleResult);
    const data: any = JSON.parse(rawData);
    setStarted(false);
    setFinished(true);
    setErrors(data.errors);
  }

  function handleSyncAction() {
    setErrors([]);
    ipcRenderer.on(`workspace-${API_ENDPOINT}`, handleResult);
    ipcRenderer.send(
      `request-workspace-${API_ENDPOINT}`,
      commitMsg,
      authorName,
      authorEmail,
      username,
      password);
    setFinished(false);
    setStarted(true);
  }

  return (
    <>
      <Card key="gitAuth" className={styles.gitAuthCard}>
        <Label>
          Git username
          <InputGroup
            value={username}
            key="username"
            type="text"
            onChange={(evt: React.FormEvent<HTMLElement>) => {
              setUsername((evt.target as HTMLInputElement).value as string);
            }}
          />
        </Label>
        <Label>
          Password
          <InputGroup
            value={password}
            key="password"
            type="password"
            onChange={(evt: React.FormEvent<HTMLElement>) => {
              setPassword((evt.target as HTMLInputElement).value as string);
            }}
          />
        </Label>
      </Card>

      <Card key="commitInfo" className={styles.commitMessageCard}>
        <Label>
          Author name
          <InputGroup
            value={authorName}
            key="authorName"
            type="text"
            onChange={(evt: React.FormEvent<HTMLElement>) => {
              setAuthorName((evt.target as HTMLInputElement).value as string);
            }}
          />
        </Label>
        <Label>
          Author email
          <InputGroup
            value={authorEmail}
            key="authorEmail"
            type="email"
            onChange={(evt: React.FormEvent<HTMLElement>) => {
              setAuthorEmail((evt.target as HTMLInputElement).value as string);
            }}
          />
        </Label>
        <FormGroup
            key="commitMsg"
            label="Change notice"
            intent="primary">
          <TextArea
            value={commitMsg}
            fill={true}
            onChange={(evt: React.FormEvent<HTMLElement>) => {
              setCommitMsg((evt.target as HTMLInputElement).value as string);
            }}
          />
        </FormGroup>
      </Card>

      {finished === true
        ? <Card key="resultMessage">
            <Callout
              intent={errors.length > 0 ? "warning" : "success"}
              title={errors.length > 0 ? "Errors encountered during sync" : "Sync completed"}>

            {errors.length > 0
              ? <UL>
                  {errors.map((err: string) =>
                    <li>{err}</li>
                  )}
                </UL>
              : <p>Your changes have been submitted.</p>}
            </Callout>
          </Card>
        : ''}

      <Card key="commitButton">
        <Button
          icon="git-merge"
          intent="primary"
          disabled={started === true}
          title="Fetch other site editors’ changes, and submit yours"
          onClick={handleSyncAction}>Sync</Button>
      </Card>
    </>
  );
};
