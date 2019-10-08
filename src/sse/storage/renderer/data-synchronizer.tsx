import { ipcRenderer } from 'electron';
import React, { useState } from 'react';
import { Card, Label, InputGroup, FormGroup, TextArea, Callout, UL, Button } from '@blueprintjs/core';

import { useWorkspaceRO } from 'sse/api/renderer';
import { useLocalStorage } from 'sse/renderer/useLocalStorage';

import { GitAuthor } from '../git';

import * as styles from './data-synchronizer.scss';


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

    if (data.errors.length < 1) {
      setCommitMsg('');
    }
  }

  function handleSyncAction() {
    setErrors([]);
    ipcRenderer.on(`workspace-${API_ENDPOINT}`, handleResult);
    ipcRenderer.send(
      `request-workspace-${API_ENDPOINT}`,
      JSON.stringify({
        commitMsg,
        authorName,
        authorEmail,
        gitUsername: username,
        gitPassword: password,
      }));
    setFinished(false);
    setStarted(true);
  }

  const complete = (
    authorName != '' &&
    authorEmail != '' &&
    username != '' &&
    password != '' &&
    commitMsg != '');

  return (
    <>
      <div className={styles.dataSyncBase}>
        <div className={styles.committerAndAuth}>
          <Card key="gitAuth" className={styles.card}>
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

          <Card key="committerInfo" className={styles.card}>
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
          </Card>
        </div>

        <div className={styles.commitInfo}>
          <Card key="commitMsg" className={styles.commitMsgCard}>
            <FormGroup
                key="commitMsg"
                label="Change notice"
                intent="primary">
              <TextArea
                value={commitMsg}
                fill={true}
                large={true}
                onChange={(evt: React.FormEvent<HTMLElement>) => {
                  setCommitMsg((evt.target as HTMLInputElement).value as string);
                }}
              />
            </FormGroup>
          </Card>

          <Card key="commitButton" className={styles.commitButtonCard}>
            <Button
              icon="git-merge"
              intent="primary"
              disabled={complete === false || started === true}
              title="Fetch other site editors’ changes, and submit yours"
              onClick={handleSyncAction}>Sync</Button>
          </Card>
        </div>
      </div>

      {finished === true
        ? <Card key="resultMessage" className={styles.resultCard}>
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
    </>
  );
};
