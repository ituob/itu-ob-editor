import { ipcRenderer } from 'electron';

import React, { useState, useEffect } from 'react';
import { Spinner, NonIdealState } from '@blueprintjs/core';

import { useWorkspace, apiRequest } from 'sse/api/renderer';
import { PaneHeader } from 'sse/renderer/widgets/pane-header';
import { Index } from 'sse/storage/query';

import { OBIssue } from 'models/issues';
import { Publication } from 'models/publications';
import { ITURecommendation } from 'models/recommendations';
import { Message } from 'models/messages';

import { Workspace } from 'main/storage';

import { reducer } from './reducer';
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

  const wsIssue = useWorkspace<OBIssue | {}>('issue', reducer, {}, { issueId: props.issueId });
  const maybeIssue = wsIssue.state;

  const [ws, updateWs] = useState({ issues: {}, publications: {}, recommendations: {} } as Workspace);

  async function fetchWorkspace() {
    updateWs({
      issues: await apiRequest<Index<OBIssue>>('storage-issues-all'),
      publications: await apiRequest<Index<Publication>>('storage-publications-all'),
      recommendations: await apiRequest<Index<ITURecommendation>>('storage-recommendations-all'),
    });
  }

  useEffect(() => {
    fetchWorkspace();
    ipcRenderer.on('publications-changed', fetchWorkspace);
    return function cleanup() {
      ipcRenderer.removeListener('publications-changed', fetchWorkspace);
    };
  }, []);

  var initialMessageIdx: number | undefined = undefined;
  var initialSection: "amendments" | "general" = "general";

  if (Object.keys(maybeIssue).length < 1) {
    // Silence React hooks :(
    useState(initialMessageIdx);
    useState(initialSection);

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

  function handleNewGeneralMessage(msg: Message, atIndex: number) {
    wsIssue.dispatch({
      type: 'ADD_GENERAL_MESSAGE',
      message: msg,
      newMessageIndex: atIndex,
    });
    setTimeout(() => {
      selectMessage(atIndex);
      selectSection("general");
    }, 100);
  }

  function handleNewAmendment(msg: Message, atIndex: number) {
    wsIssue.dispatch({
      type: 'ADD_AMENDMENT_MESSAGE',
      message: msg,
      newMessageIndex: atIndex,
    });
    setTimeout(() => {
      selectMessage(atIndex);
      selectSection("amendments");
    }, 100);
  }

  return (
    <div className={styles.twoPaneEditor}>
      <div className={styles.messageListPane}>
        <PaneHeader align="right" loud={true} className={styles.paneHeader}>No. {issue.id}</PaneHeader>

        <div className={styles.paneBody}>
          <PaneHeader align="left">General messages</PaneHeader>
          <NewGeneralMessagePrompt idx={0} issue={issue} handleNewMessage={handleNewGeneralMessage} />

          {[...issue.general.messages.entries()].map(([idx, msg]: [number, Message]) => (
            <>
              <MessageItem
                selected={idx == selectedMessage && selectedSection === 'general'}
                message={msg}
                onSelect={() => { selectMessage(idx); selectSection("general"); }}
                onDelete={() => {
                  wsIssue.dispatch({
                    type: 'REMOVE_GENERAL_MESSAGE',
                    messageIndex: idx,
                  });
                  selectMessage(undefined);
                }}
              />
              <NewGeneralMessagePrompt idx={idx + 1} issue={issue} handleNewMessage={handleNewGeneralMessage} />
            </>
          ))}

          <PaneHeader align="left">Amendments</PaneHeader>
          <NewAmendmentPrompt
            idx={0}
            issue={issue}
            issueIndex={ws.issues}
            publicationIndex={ws.publications}
            handleNewMessage={handleNewAmendment} />
          {[...issue.amendments.messages.entries()].map(([idx, msg]: [number, Message]) => (
            <>
              <MessageItem
                selected={idx == selectedMessage && selectedSection === 'amendments'}
                message={msg}
                onSelect={() => { selectMessage(idx); selectSection("amendments"); }}
                onDelete={() => {
                  wsIssue.dispatch({
                    type: 'REMOVE_AMENDMENT_MESSAGE',
                    messageIndex: idx,
                  });
                  selectMessage(undefined);
                }}
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
        {selectedMessage !== undefined
          ? <MessageEditor
              workspace={ws}
              message={issue[selectedSection].messages[selectedMessage]}
              issue={issue}
              onChange={(updatedMessage: any) => {
                if (selectedSection === "general") {
                  wsIssue.dispatch({
                    type: 'EDIT_GENERAL_MESSAGE',
                    messageIndex: selectedMessage,
                    messageData: updatedMessage,
                  });
                } else if (selectedSection === "amendments") {
                  wsIssue.dispatch({
                    type: 'EDIT_AMENDMENT_MESSAGE',
                    messageIndex: selectedMessage,
                    messageData: updatedMessage,
                  });
                }
              }}
            />
          : <NonIdealState
              icon="info-sign"
              title="No message selected"
              description="Add or select a message on the left to start."
            />}
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
        onChange={props.onChange}
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
