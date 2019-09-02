import { ipcRenderer } from 'electron';
import React, { useState } from 'react';
import { Card, FormGroup, TextArea, Callout, UL, Button } from '@blueprintjs/core';

import * as styles from './styles.scss';


const API_ENDPOINT = 'fetch-commit-push'


interface DataSynchronizerProps {}
export const DataSynchronizer: React.FC<DataSynchronizerProps> = function () {
  const [commitMsg, setCommitMsg] = useState('');
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
    ipcRenderer.send(`request-workspace-${API_ENDPOINT}`, commitMsg);
    setFinished(false);
    setStarted(true);
  }

  return (
    <>
      <Card key="commitMsg" className={styles.commitMessageCard}>
        <FormGroup
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
