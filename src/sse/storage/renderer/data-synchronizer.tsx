import { remote, ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';
import { H4, Collapse, Card, Label, InputGroup, FormGroup, TextArea, Callout, UL, Button } from '@blueprintjs/core';

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

  const [repoConfigOpenState, updateRepoConfigOpenState] = useState(false);
  const [repoConfigComplete, updateRepoConfigComplete] = useState(false);

  const repoCfg = useWorkspaceRO<{ author: GitAuthor, originURL: string | null | undefined }>(
    'git-config',
    { originURL: undefined, author: {} });

  useEffect(() => {
    if (repoCfg.originURL !== undefined) {
      const _complete = (
        username.trim() !== '' &&
        password.trim() !== '' &&
        (repoCfg.originURL || '').trim() !== '');

      updateRepoConfigComplete(_complete);
      if (repoConfigOpenState === false && _complete === false) {
        updateRepoConfigOpenState(true);
      }
    }
  }, [username, password, repoCfg.originURL]);

  const [errors, setErrors] = useState([] as string[]);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);

  if (authorName.trim() === '' && repoCfg.author.name !== undefined) { setAuthorName(repoCfg.author.name); }
  if (authorEmail.trim() === '' && repoCfg.author.email !== undefined) { setAuthorEmail(repoCfg.author.email); }

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
    updateRepoConfigOpenState(false);
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

  async function handleResetURL() {
    await ipcRenderer.send('clear-setting', 'gitRepoUrl');
    remote.app.relaunch();
    remote.app.quit();
  }

  const complete = (
    authorName.trim() != '' &&
    authorEmail.trim() != '' &&
    username.trim() != '' &&
    password.trim() != '' &&
    commitMsg.trim() != '');

  return (
    <>
      <div className={styles.dataSyncBase}>
        <Button disabled={!repoConfigComplete} onClick={() => updateRepoConfigOpenState(!repoConfigOpenState)}>
          {repoConfigComplete && repoConfigOpenState ? 'Hide r' : 'R'}
          epository configuration
          {!repoConfigOpenState && repoConfigComplete ? '…': null}
        </Button>

        <Collapse className={styles.repoConfigCollapsible} isOpen={repoConfigOpenState}>
          <Card key="repoUrl" className={styles.repoUrlCard}>
            <FormGroup
                label="Repository URL"
                helperText={<Callout intent="warning">Note: resetting the URL will cause you to lose any unsubmitted changes.</Callout>}>
              <InputGroup
                defaultValue={repoCfg.originURL || ''}
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
            </FormGroup>
          </Card>

          <Card key="repoAuth" className={styles.repoAuthCard}>
            <div className={styles.dataSyncRow}>
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
            </div>
          </Card>
        </Collapse>

        {finished === true
          ? <Collapse isOpen={!repoConfigOpenState}>
              <Card key="resultMessage" className={styles.resultCard}>
                <Callout
                  intent={errors.length > 0 ? "warning" : "success"}
                  title={errors.length > 0 ? "Errors encountered during merge sequence" : "Merge completed"}>

                {errors.length > 0
                  ? <UL>
                      {errors.map((err: string) =>
                        <li>{err}</li>
                      )}
                    </UL>
                  : <p>Your changes have been merged and submitted.</p>}
                </Callout>
              </Card>
            </Collapse>
          : ''}

        <Card key="committerInfo" className={styles.committerInfoCard}>
          <H4>Committing changes as</H4>

          <div className={styles.dataSyncRow}>
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
          </div>
        </Card>

        <Card key="commitRow" className={styles.commitCard}>
          <H4>Change notice</H4>

          <FormGroup
              className={styles.formGroup}
              key="commitMsg"
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
            className={styles.syncButton}
            icon="git-merge"
            intent="primary"
            large={true}
            disabled={complete === false || started === true}
            title="Fetch other site editors’ changes, and submit yours"
            onClick={handleSyncAction}>Merge Changes</Button>
        </Card>
      </div>
    </>
  );
};
