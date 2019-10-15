import { remote, ipcRenderer } from 'electron';
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

  const repoCfg = useWorkspaceRO<{ author: GitAuthor, originURL: string | undefined }>(
    'git-config',
    { originURL: undefined, author: {} });

  if (authorName === '' && repoCfg.author.name !== undefined) { setAuthorName(repoCfg.author.name); }
  if (authorEmail === '' && repoCfg.author.email !== undefined) { setAuthorEmail(repoCfg.author.email); }

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

  function handleResetURL() {
    ipcRenderer.sendSync('clear-setting', 'gitRepoUrl');
    remote.app.relaunch();
    remote.app.quit();
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
        <Card key="repoUrl" className={styles.repoUrlRow}>
          <Label>
            Git repository URL
            <InputGroup
              defaultValue={repoCfg.originURL}
              disabled={true}
              type="text"
              rightElement={
                <Button
                    intent="warning"
                    minimal={true}
                    title="Reset repository URL. Note: you will lose any unsubmitted changes."
                    onClick={handleResetURL}>
                  Reset URL
                </Button>
              }
            />
          </Label>
        </Card>

        <Card key="repoAuth" className={styles.repoAuthRow}>
          <Label key="username">
            Git username
            <InputGroup
              value={username}
              type="text"
              onChange={(evt: React.FormEvent<HTMLElement>) => {
                setUsername((evt.target as HTMLInputElement).value as string);
              }}
            />
          </Label>
          <Label key="password">
            Password
            <InputGroup
              value={password}
              type="password"
              onChange={(evt: React.FormEvent<HTMLElement>) => {
                setPassword((evt.target as HTMLInputElement).value as string);
              }}
            />
          </Label>
        </Card>

        <Card key="committerInfo" className={styles.committerInfoRow}>
          <Label key="authorName">
            Author name
            <InputGroup
              value={authorName}
              type="text"
              onChange={(evt: React.FormEvent<HTMLElement>) => {
                setAuthorName((evt.target as HTMLInputElement).value as string);
              }}
            />
          </Label>
          <Label key="authorEmail">
            Author email
            <InputGroup
              value={authorEmail}
              type="email"
              onChange={(evt: React.FormEvent<HTMLElement>) => {
                setAuthorEmail((evt.target as HTMLInputElement).value as string);
              }}
            />
          </Label>
        </Card>

        <Card key="commitRow" className={styles.commitRow}>
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

          <Button
            icon="git-merge"
            intent="primary"
            large={true}
            disabled={complete === false || started === true}
            title="Fetch other site editors’ changes, and submit yours"
            onClick={handleSyncAction}>Sync</Button>
        </Card>
      </div>

      {finished === true
        ? <Card key="resultMessage" className={styles.resultRow}>
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
