import { ipcRenderer } from 'electron';
import React from 'react';
import { ButtonGroup, Button } from '@blueprintjs/core';
import { QuerySet, sortIntegerAscending } from './storage/query';
import { Storage } from './storage';
import { OBIssue } from './issues/models';
import * as styles from './styles.scss';


interface HomeScreenProps {
  storage: Storage,
}
export const HomeScreen: React.FC<HomeScreenProps> = function ({ storage }) {
  const issues = new QuerySet<OBIssue>(storage.workspace.issues);
  const futureIssues = issues.filter(item => {
    return item[1].publication_date.getTime() >= new Date().getTime();
  }).orderBy(sortIntegerAscending).all();

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
