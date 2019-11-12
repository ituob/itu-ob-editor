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
import { Message } from 'models/messages';

import { Workspace } from 'main/storage';

import { getMessageEditor } from './message-editor';
import { NewGeneralMessagePrompt } from './new-general-message-menu';
import { NewAmendmentPrompt } from './new-amendment-menu';
import { MessageItem } from './message-list-item';

import * as styles from './styles.scss';


interface IssueEditorProps {
  issueId: string,
}
export function IssueEditor(props: IssueEditorProps) {
  // This rendering logic can (should) be refactored.

  const [maybeIssue, updateIssue] = useState(null as OBIssue | null);
  const [ws, updateWs] = useState({ issues: {}, publications: {}, recommendations: {} } as Workspace);

  async function fetchWorkspace() {
    updateWs({
      issues: await request<Index<OBIssue>>('storage-get-all-issues'),
      publications: await request<Index<Publication>>('storage-get-all-publications'),
      recommendations: await request<Index<ITURecommendation>>('storage-get-all-recommendations'),
    });
  }

  async function fetchIssue() {
    const issue = await request<OBIssue>('issue', { issueId: props.issueId });
    updateIssue(issue);
  }

  useEffect(() => {
    fetchWorkspace();
    fetchIssue();
    ipcRenderer.on('publications-changed', fetchWorkspace);
    return function cleanup() {
      ipcRenderer.removeListener('publications-changed', fetchWorkspace);
    };
  }, []);



  var initialMessageIdx: number | undefined = undefined;
  var initialSection: OBMessageSection = 'general';

  if (maybeIssue === null) {
    // Silence React hooks :(
    useState(initialMessageIdx);
    useState(initialSection);
    useMemo(() => {}, [null, null]);

    return <Spinner className={styles.spinner} />;
  }

  const issue = maybeIssue as OBIssue;

  if (issue.general.messages.length > 0) {
    initialMessageIdx = 0;
    initialSection = "general";
  } else if (issue.amendments.messages.length > 0) {
    initialMessageIdx = 0;
    initialSection = "amendments";
  }

  const [ selectedMessage, selectMessage ] = useState(initialMessageIdx);
  const [ selectedSection, selectSection ] = useState(initialSection);

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

  function handleMessageSelection(inSection: OBMessageSection, atIndex: number) {
    selectMessage(atIndex);
    selectSection(inSection); 
  }

  function handleNewMessage(msg: Message, inSection: OBMessageSection, atIndex: number) {
    if (issue) {
      updateIssue(issueFactories.withAddedMessage(issue, inSection, atIndex, msg));

      request<{ success: boolean }>('add-ob-message', {
        issueId: props.issueId,
        section: inSection,
        msgIdx: atIndex,
        msg: msg,
      });

      setTimeout(() => {
        selectMessage(atIndex);
        selectSection(inSection);
      }, 100);
    }
  }

  function handleNewGeneralMessage(msg: Message, idx: number) {
    return handleNewMessage(msg, 'general', idx);
  }

  function handleNewAmendment(msg: Message, idx: number) {
    return handleNewMessage(msg, 'amendments', idx);
  }

  function handleMessageRemoval(inSection: OBMessageSection, atIndex: number) {
    if (issue) {
      updateIssue(issueFactories.withRemovedMessage(issue, inSection, atIndex));

      request<{ success: boolean }>('remove-ob-message', {
        issueId: props.issueId,
        section: inSection,
        msgIdx: atIndex,
      });

      selectMessage(undefined);
    }
  }

  async function _requestMessageUpdate(inSection: OBMessageSection, atIdx: number, withNewMessage: any) {
    await request<{ success: boolean }>('edit-ob-message', {
      issueId: props.issueId,
      section: inSection,
      msgIdx: atIdx,
      updatedMsg: withNewMessage,
    });
  }

  // Slow down updates to reduce the chance of race condition when user makes many edits in rapids succession
  // TODO: A lock would be better
  const requestMessageUpdate = throttle(500, _requestMessageUpdate);

  function handleMessageEdit(updatedMessage: Message) {
    if (selectedMessage !== undefined) {
      if (issue !== null) {
        requestMessageUpdate(selectedSection, selectedMessage, updatedMessage);
        updateIssue(issueFactories.withEditedMessage(issue, selectedSection, selectedMessage, updatedMessage));
      }
    }
  }

  return (
    <div className={styles.twoPaneEditor}>
      <div className={styles.messageListPane}>
        <PaneHeader align="right" loud={true} className={styles.paneHeader}>No. {issue.id}</PaneHeader>

        <div className={styles.paneBody}>
          <PaneHeader align="left">General messages</PaneHeader>
          <NewGeneralMessagePrompt
            highlight={issue.general.messages.length < 1}
            idx={0}
            issue={issue}
            handleNewMessage={handleNewGeneralMessage} />

          {[...issue.general.messages.entries()].map(([idx, msg]: [number, Message]) => (
            <>
              <MessageItem
                message={msg}
                selected={idx == selectedMessage && selectedSection === 'general'}
                onSelect={() => handleMessageSelection('general', idx)}
                onDelete={() => handleMessageRemoval('general', idx)}
              />
              <NewGeneralMessagePrompt idx={idx + 1} issue={issue} handleNewMessage={handleNewGeneralMessage} />
            </>
          ))}

          <PaneHeader align="left" className={styles.amendmentsHeader}>Amendments</PaneHeader>
          <NewAmendmentPrompt
            idx={0}
            highlight={issue.amendments.messages.length < 1}
            issue={issue}
            issueIndex={ws.issues}
            publicationIndex={ws.publications}
            handleNewMessage={handleNewAmendment} />
          {[...issue.amendments.messages.entries()].map(([idx, msg]: [number, Message]) => (
            <>
              <MessageItem
                message={msg}
                selected={idx == selectedMessage && selectedSection === 'amendments'}
                onSelect={() => handleMessageSelection('amendments', idx)}
                onDelete={() => handleMessageRemoval('amendments', idx)}
              />
              <NewAmendmentPrompt
                idx={idx + 1}
                issue={issue}
                issueIndex={ws.issues}
                publicationIndex={ws.publications}
                handleNewMessage={handleNewAmendment} />
            </>
          ))}
        </div>

      </div>
      <div className={`
          ${styles.selectedMessagePane}
          editor-pane-message-${selectedMessage !== undefined ? (issue[selectedSection].messages[selectedMessage] || {}).type : ''}`}>
        {editor}
      </div>
    </div>
  )
}


interface MessageEditorProps {
  workspace: Workspace,
  message: Message,
  issue: OBIssue,
  onChange: (updatedMessage: Message) => void,
}
const MessageEditor: React.FC<MessageEditorProps> = function (props) {
  if (props.message) {
    const EditorCls = getMessageEditor(props.message);
    return (
      <EditorCls
        workspace={props.workspace}
        message={props.message}
        issue={props.issue}
        onChange={(updatedMessage: any) => props.onChange({ ...updatedMessage, type: props.message.type })}
      />
    );
  } else {
    return (
      <NonIdealState
        icon="error"
        title="Error loading message"
      />
    );
  }
};
