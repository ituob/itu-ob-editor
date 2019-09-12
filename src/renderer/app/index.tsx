import { ipcRenderer } from 'electron';
import React from 'react';
import { ButtonGroup, Button } from '@blueprintjs/core';
import { OBIssue } from 'main/issues/models';
import { useWorkspaceRO } from 'renderer/app/storage/api';
import * as styles from './styles.scss';


interface HomeScreenProps {}
export const HomeScreen: React.FC<HomeScreenProps> = function () {
  const futureIssues = useWorkspaceRO<OBIssue[]>(
    'future-issues',
    [],
    true);

  return (
    <div className={styles.homeMenuContainer}>
      <ButtonGroup
          className={styles.mainButtonGroup}
          large={true}
          vertical={true}
          fill={true}>

        <Button
          text={futureIssues.length > 0 ? `Open no. ${futureIssues[0].id}` : "Open current"}
          title="Edit current edition"
          disabled={futureIssues.length < 1}
          icon="edit"
          onClick={() => ipcRenderer.sendSync('open-issue-editor', `${futureIssues[0].id}`)}
        />
        <Button
          text="Schedule"
          title="Schedule future editions"
          icon="timeline-events"
          onClick={() => ipcRenderer.sendSync('open-issue-scheduler')}
        />
        <Button
          text="Translate"
          disabled={true}
          title="Translate edition contents"
          icon="translate"
          onClick={() => ipcRenderer.sendSync('open-translator')}
        />
        <Button
          text="Edit database"
          disabled={true}
          title="Back-fill legacy edition data"
          icon="database"
          onClick={() => ipcRenderer.sendSync('open-data-doctor')}
        />
        <Button
          text="Sync changes"
          title="Fetch latest changes & send yours"
          icon="git-merge"
          disabled={false}
          onClick={() => ipcRenderer.sendSync('open-data-synchronizer')}
        />

      </ButtonGroup>
    </div>
  );
};

export { IssueScheduler } from './issues/scheduler';
export { IssueEditor } from './issues/editor';
export { DataSynchronizer } from './data-synchronizer';
