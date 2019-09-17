import { ipcRenderer } from 'electron';
import React from 'react';
import { ButtonGroup, Button } from '@blueprintjs/core';

import { useWorkspaceRO } from 'sse/api/renderer';
import { OBIssue } from 'models/issues';
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
          text="Spotlight"
          title="Find things"
          icon="search"
          onClick={() => ipcRenderer.sendSync('open-spotlight')}
        />
        <Button
          text="Preflight"
          title="Check for issues"
          icon="form"
          onClick={() => ipcRenderer.sendSync('open-preflight')}
        />
        <Button
          text="Sync changes"
          title="Fetch latest changes & submit yours"
          icon="git-merge"
          onClick={() => ipcRenderer.sendSync('open-data-synchronizer')}
        />

      </ButtonGroup>
    </div>
  );
};
