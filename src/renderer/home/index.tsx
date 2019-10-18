import { ipcRenderer } from 'electron';
import React, { useState, useEffect } from 'react';
import { ButtonGroup, Button, Classes } from '@blueprintjs/core';

import { apiRequest } from 'sse/api/renderer';
import * as styles from './styles.scss';


interface HomeScreenProps {}
export const HomeScreen: React.FC<HomeScreenProps> = function () {
  const [currentIssue, setCurrentIssue] = useState({ id: null } as { id: number | null });
  const [loading, setLoading] = useState(true);

  async function reloadCurrentIssue() {
    const currentIssue = await apiRequest<{ id: number | null }>('current-issue-id');
    setLoading(false);
    setCurrentIssue(currentIssue);
  }

  useEffect(() => {
    reloadCurrentIssue();
    ipcRenderer.once('app-loaded', reloadCurrentIssue);
    ipcRenderer.on('update-current-issue', reloadCurrentIssue);
    return function cleanup() {
      ipcRenderer.removeListener('update-current-issue', reloadCurrentIssue);
      ipcRenderer.removeListener('app-loaded', reloadCurrentIssue);
    };
  }, []);

  return (
    <div className={styles.homeMenuContainer}>
      <ButtonGroup
          className={styles.mainButtonGroup}
          large={true}
          vertical={true}
          fill={true}>

        <Button
            title="Edit current edition"
            disabled={currentIssue.id === null}
            icon="edit"
            onClick={() => currentIssue.id ? ipcRenderer.sendSync('open-issue-editor', `${currentIssue.id}`) : void 0}>
          <span className={loading ? Classes.SKELETON : undefined}>
            {currentIssue.id !== null ? `Open no. ${currentIssue.id}` : "Open current"}
          </span>
        </Button>

        <Button
          text="Schedule"
          title="Schedule future editions"
          disabled={loading}
          icon="timeline-events"
          onClick={() => ipcRenderer.sendSync('open-issue-scheduler')}
        />

        <Button
          text="Spotlight"
          title="Find things"
          disabled={loading}
          icon="search"
          onClick={() => ipcRenderer.sendSync('open-spotlight')}
        />
        <Button
          text="Preflight"
          title="Check for issues"
          disabled={loading}
          icon="form"
          onClick={() => ipcRenderer.sendSync('open-preflight')}
        />
        <Button
          text="Merge"
          title="Fetch latest changes & submit yours"
          disabled={loading}
          icon="git-merge"
          onClick={() => ipcRenderer.sendSync('open-data-synchronizer')}
        />

      </ButtonGroup>
    </div>
  );
};
