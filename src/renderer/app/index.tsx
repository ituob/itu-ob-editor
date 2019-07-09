import { ipcRenderer } from 'electron';
import React from 'react';
import { ButtonGroup, Button } from '@blueprintjs/core';
import { Storage } from './storage';
export { IssueScheduler } from './issues/scheduler';
export { IssueEditor } from './issues/editor';
import * as styles from './styles.scss';


interface HomeScreenProps {
  storage: Storage,
}
export const HomeScreen: React.FC<HomeScreenProps> = function ({ storage }) {
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
          disabled={true}
          icon="edit"
          onClick={() => ipcRenderer.send('schedule-issues')}
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
