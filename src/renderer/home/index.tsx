import { ipcRenderer } from 'electron';
import React, { useState, useEffect } from 'react';
import { ButtonGroup, Button } from '@blueprintjs/core';

import { apiRequest } from 'sse/api/renderer';
import * as styles from './styles.scss';


interface HomeScreenProps {}
export const HomeScreen: React.FC<HomeScreenProps> = function () {
  const [currentIssue, setCurrentIssue] = useState({ id: null } as { id: number | null });

  useEffect(() => {
    (async () =>
      setCurrentIssue(await apiRequest<{ id: number | null }>('current-issue-id'))
    )();
  }, []);

  return (
    <div className={styles.homeMenuContainer}>
      <ButtonGroup
          className={styles.mainButtonGroup}
          large={true}
          vertical={true}
          fill={true}>

        <Button
          text={currentIssue.id !== null ? `Open no. ${currentIssue.id}` : "Open current"}
          title="Edit current edition"
          disabled={currentIssue.id === null}
          icon="edit"
          onClick={() => currentIssue.id ? ipcRenderer.sendSync('open-issue-editor', `${currentIssue.id}`) : void 0}
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
