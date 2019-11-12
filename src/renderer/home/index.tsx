import { ipcRenderer } from 'electron';
import React, { useState, useEffect } from 'react';
import { ButtonGroup, Button, Classes } from '@blueprintjs/core';

import { request, openWindow } from 'sse/api/renderer';
import * as styles from './styles.scss';


interface HomeScreenProps {}
export const HomeScreen: React.FC<HomeScreenProps> = function () {
  const [currentIssue, setCurrentIssue] = useState({ id: null } as { id: number | null });
  const [loading, setLoading] = useState(true);

  async function reloadCurrentIssue() {
    const currentIssue = await request<{ id: number | null }>('current-issue-id');
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
            minimal={true}
            intent="primary"
            title="Edit current edition"
            disabled={currentIssue.id === null}
            icon="edit"
            onClick={() => currentIssue.id ? openWindow('issue-editor', { issueId: currentIssue.id }) : void 0}>
          <span className={loading ? Classes.SKELETON : undefined}>
            {currentIssue.id !== null ? `Open no. ${currentIssue.id}` : "Open current"}
          </span>
        </Button>

        <Button
          minimal={true}
          text="Schedule"
          title="Schedule future editions"
          disabled={loading}
          icon="timeline-events"
          onClick={() => openWindow('issue-scheduler')}
        />
        <Button
          minimal={true}
          intent="success"
          text="Merge"
          title="Fetch latest changes & submit yours"
          disabled={loading}
          icon="git-merge"
          onClick={() => openWindow('data-synchronizer')}
        />
        <Button
          minimal={true}
          text="Settings"
          icon="settings"
          className={styles.secondaryButton}
          onClick={() => openWindow('settings')}
        />
      </ButtonGroup>
    </div>
  );
};
