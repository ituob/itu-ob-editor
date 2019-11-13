import { throttle } from 'throttle-debounce';
import { ipcRenderer } from 'electron';

import React, { useMemo, useState, useEffect } from 'react';
import { Spinner, NonIdealState } from '@blueprintjs/core';

import { request } from 'sse/api/renderer';
import { PaneHeader } from 'sse/renderer/widgets/pane-header';
import { Index } from 'sse/storage/query';

import { OBIssue, OBMessageSection, issueFactories } from 'models/issues';
import { Publication } from 'models/publications';
import { ITURecommendation } from 'models/recommendations';
import { Message, AmendmentMessage } from 'models/messages';

import { Workspace } from 'main/storage';

import { MessageList } from './message-list';
import { NewGeneralMessagePrompt } from './new-general-message-menu';
import { NewAmendmentPrompt } from './new-amendment-menu';
import { MessageEditor } from './message-editor';

import * as styles from './styles.scss';


export const IssueEditor: React.FC<{ issueId: string }> = ({ issueId }) => {

  /* On first render only: fetch data from storage, set up re-fetching where needed */

  useEffect(() => {
    storageGetIssue();

    storageGetWorkspace();
    ipcRenderer.on('publications-changed', storageGetWorkspace);

    return function cleanup() {
      ipcRenderer.removeListener('publications-changed', storageGetWorkspace);
    };
  }, []);


  /* Prepare initial state */

  var initialMessageIdx: number | undefined = undefined;
  var initialSection: OBMessageSection = 'general';

  const [maybeIssue, updateIssue] = useState(null as OBIssue | null);
  const [ws, updateWs] = useState({ issues: {}, publications: {}, recommendations: {} } as Workspace);

  // If issue hasn’t loaded yet, silence React hooks and bail out of rendering early:
  if (maybeIssue === null) {
    useState(initialMessageIdx);
    useState(initialSection);
    useMemo(() => {}, [null, null, 0]);

    return <Spinner className={styles.spinner} />;
  }
  // Since we didn’t bail, we have a proper issue:
  const issue = maybeIssue as OBIssue;

  if (issue.general.messages.length > 0) {
    initialMessageIdx = 0;
    initialSection = "general";
  } else if (issue.amendments.messages.length > 0) {
    initialMessageIdx = 0;
    initialSection = "amendments";
  }

  const [selectedMessage, selectMessage] = useState(initialMessageIdx);
  const [selectedSection, selectSection] = useState(initialSection);


  /* Message editor */

  // Memoization ensures that updating message on every keystroke
  // doesn’t cause the editor to re-render, which loses cursor position and undo history.
  // Only re-render if message index or section, meaning a switch to another message.
  const editor = useMemo(() => (
    selectedMessage !== undefined
      ? <MessageEditor
          workspace={ws}
          message={issue[selectedSection].messages[selectedMessage]}
          issue={issue}
          onChange={handleMessageEdit}
        />
      : <NonIdealState
          icon="info-sign"
          title="No message selected"
          description="Add or select a message on the left to start."
        />
  ), [selectedMessage, selectedSection, (issue.amendments.messages.length + issue.general.messages.length)]);


  /* Storage API utilities */

  async function storageGetWorkspace() {
    updateWs({
      issues: await request<Index<OBIssue>>('storage-get-all-issues'),
      publications: await request<Index<Publication>>('storage-get-all-publications'),
      recommendations: await request<Index<ITURecommendation>>('storage-get-all-recommendations'),
    });
  }

  async function storageGetIssue() {
    const issue = await request<OBIssue>('issue', { issueId });
    updateIssue(issue);
  }

  async function _storageUpdateIssue(action: string, params: any) {
    // TODO: Handle API failure
    return await request<{ success: boolean }>(`issue-${action}`, { issueId, ...params });
  }
  // Slow down updates to reduce the chance of race condition when user makes many edits in rapids succession
  // TODO: A lock would be better
  const storageUpdateIssue = throttle(500, _storageUpdateIssue);


  /* Event handling utilities */

  function handleMessageSelection(inSection: OBMessageSection, atIndex: number) {
    selectMessage(atIndex);
    selectSection(inSection); 
  }

  function handleNewMessage(msg: Message, inSection: OBMessageSection, atIndex: number) {
    if (issue) {
      updateIssue(issueFactories.withAddedMessage(issue, inSection, atIndex, msg));
      storageUpdateIssue('create-message', { section: inSection, msgIdx: atIndex, msg: msg });
      setTimeout(() => {
        selectMessage(atIndex);
        selectSection(inSection);
      }, 100);
    }
  }

  function handleMessageEdit(updatedMessage: Message) {
    if (issue !== null && selectedMessage !== undefined) {
      updateIssue(issueFactories.withEditedMessage(issue, selectedSection, selectedMessage, updatedMessage));
      storageUpdateIssue('update-message', {
        section: selectedSection,
        msgIdx: selectedMessage,
        updatedMsg: updatedMessage,
      });
    }
  }

  function handleMessageRemoval(inSection: OBMessageSection, atIndex: number) {
    if (issue) {
      updateIssue(issueFactories.withRemovedMessage(issue, inSection, atIndex));
      storageUpdateIssue('delete-message', { section: inSection, msgIdx: atIndex });
      selectMessage(undefined);
    }
  }

  return (
    <div className={styles.twoPaneEditor}>
      <div className={styles.messageListPane}>
        <PaneHeader align="right" loud={true} className={styles.paneHeader}>No. {issue.id}</PaneHeader>

        <div className={styles.paneBody}>

          <MessageList
            title="General Messages"
            issueId={issue.id}
            items={issue.general.messages}
            selectedIdx={selectedSection === 'general' ? selectedMessage : undefined}
            onSelect={(idx) => handleMessageSelection('general', idx)}
            onDelete={(idx) => handleMessageRemoval('general', idx)}
            prompt={(idx, highlight) =>
              <NewGeneralMessagePrompt
                highlight={highlight}
                idx={idx}
                existingMessages={issue.general.messages}
                onCreate={(msg, idx) => handleNewMessage(msg, 'general', idx)} />}
          />

          <MessageList
            title="Amendments"
            issueId={issue.id}
            items={issue.amendments.messages}
            selectedIdx={selectedSection === 'amendments' ? selectedMessage : undefined}
            onSelect={(idx) => handleMessageSelection('amendments', idx)}
            onDelete={(idx) => handleMessageRemoval('amendments', idx)}
            className={styles.amendmentsList}
            prompt={(idx, highlight) =>
              <NewAmendmentPrompt
                highlight={highlight}
                idx={idx}
                issueId={issue.id}
                issueIndex={ws.issues}
                publicationIndex={ws.publications}
                existingAmendments={issue.amendments.messages.map((msg: Message) => msg as AmendmentMessage)}
                onCreate={(msg, idx) => handleNewMessage(msg, 'amendments', idx)} />}
          />

        </div>
      </div>

      <div className={`
          ${styles.selectedMessagePane}
          editor-pane-message-${selectedMessage !== undefined ? (issue[selectedSection].messages[selectedMessage] || {}).type : ''}`}>
        {editor}
      </div>

    </div>
  )
};
