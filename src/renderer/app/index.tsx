import { ipcRenderer } from 'electron';
import React from 'react';
import { ButtonGroup, Button } from '@blueprintjs/core';
import { OBIssue } from 'main/issues/models';
import { useWorkspaceRO } from 'renderer/app/storage/api';
import * as styles from './styles.scss';


type State = OBIssue[];

interface HomeScreenProps {}
export const HomeScreen: React.FC<HomeScreenProps> = function () {
  const futureIssues = useWorkspaceRO<State>(
    'future-issues',
    [],
    true);

  return (
    <div className={styles.homeMenuContainer}>
      <ButtonGroup
          large={true}
          vertical={true}
          fill={true}>
        <Button
          text="Schedule"
          title="Schedule future editions"
          icon="calendar"
          onClick={() => ipcRenderer.send('schedule-issues')}
        />
        <Button
          text="Open current"
          title="Edit current edition"
          disabled={futureIssues.length < 1}
          icon="edit"
          onClick={() => ipcRenderer.send('edit-issue', `${futureIssues[0].id}`)}
        />
        <Button
          text="Sync changes"
          title="Fetch latest changes & send yours"
          icon="git-merge"
          disabled={false}
          onClick={() => ipcRenderer.send('sync-changes')}
        />
      </ButtonGroup>
    </div>
  );
};

export { IssueScheduler } from './issues/scheduler';
export { IssueEditor } from './issues/editor';
export { DataSynchronizer } from './data-synchronizer';
