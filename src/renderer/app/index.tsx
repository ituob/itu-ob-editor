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
          text="Schedule issues"
          icon="calendar"
          onClick={() => ipcRenderer.send('schedule-issues')}
        />
        <Button
          text="Edit current issue"
          disabled={futureIssues.length < 1}
          icon="edit"
          onClick={() => ipcRenderer.send('edit-issue', `${futureIssues[0].id}`)}
        />
        <Button
          text="Sync your changes"
          icon="git-merge"
          disabled={true}
          onClick={() => ipcRenderer.send('schedule-issues')}
        />
      </ButtonGroup>
    </div>
  );
};

export { IssueScheduler } from './issues/scheduler';
export { IssueEditor } from './issues/editor';
