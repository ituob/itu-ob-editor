import React, { useState } from 'react';
import { Button, Popover } from '@blueprintjs/core';
import { Workspace } from 'main/storage';
import { OBIssue } from 'main/issues/models';
import { Message, AmendmentMessage } from 'main/issues/messages';

import { useWorkspace, useWorkspaceRO } from 'renderer/app/storage/api';
import { reducer } from './reducer';
import { getMessageEditor } from './message-templates';
import { NewGeneralMessageMenu } from './new-general-message-menu';
import { NewAmendmentMessageMenu } from './new-amendment-menu';
import { MessageItem } from './message-list-item';
import * as styles from './styles.scss';


interface IssueEditorProps {
  issueId: string,
}
export function IssueEditor(props: IssueEditorProps) {
  const wsIssue = useWorkspace<OBIssue | {}>('issue', reducer, {}, props.issueId);
  const maybeIssue = wsIssue.state;

  const ws = useWorkspaceRO<Workspace>(
    'all',
    { issues: {}, publications: {}, recommendations: {} },
    false);

  var initialMessage: Message | undefined = undefined;
  var initialSection: "amendments" | "general" | undefined = undefined;

  if (Object.keys(maybeIssue).length < 1) {
    // Silence React hooks :(
    useState(initialMessage);
    useState(initialSection);

    return <p>Loading…</p>;
  }

  const issue = maybeIssue as OBIssue;

  if (issue.general.messages.length > 0) {
    initialMessage = maybeIssue.general.messages[0];
    initialSection = "general";
  } else if (issue.amendments.messages.length > 0) {
    initialMessage = maybeIssue.amendments.messages[0];
    initialSection = "amendments";
  }

  const [ selectedMessage, selectMessage ] = useState(initialMessage);
  const [ selectedSection, selectSection ] = useState(initialSection);

  function newGeneralMessagePrompt(idx: number) {
    return (
      <NewMessagePrompt menu={
        <NewGeneralMessageMenu
          issue={issue}
          onCreate={(msg) => {
            wsIssue.dispatch({
              type: 'ADD_GENERAL_MESSAGE',
              message: msg,
              newMessageIndex: idx,
            });
            setTimeout(() => {
              selectMessage(msg);
              selectSection("general");
            }, 100);
          }}
        />
      } />
    );
  }

  function newAmendmentMessagePrompt(idx: number) {
    return (
      <NewMessagePrompt menu={
        <NewAmendmentMessageMenu
          issue={issue}
          issueIndex={ws.issues}
          publicationIndex={ws.publications}
          onCreate={(msg: AmendmentMessage) => {
            wsIssue.dispatch({
              type: 'ADD_AMENDMENT_MESSAGE',
              message: msg as Message,
              newMessageIndex: idx,
            });
            setTimeout(() => {
              selectMessage(msg);
              selectSection("amendments");
            }, 100);
          }}
        />
      } />
    );
  }

  return (
    <div className={styles.twoPaneEditor}>
      <div className={styles.messageListPane}>

        <h2 className={styles.issueSectionHeader}>General</h2>
        {newGeneralMessagePrompt(0)}
        {[...issue.general.messages.entries()].map(([idx, msg]: [number, Message]) => (
          <React.Fragment>
            <MessageItem
              selected={msg == selectedMessage && selectedSection === 'general'}
              message={msg}
              onSelect={() => { selectMessage(msg); selectSection("general"); }}
              onDelete={() => {
                wsIssue.dispatch({
                  type: 'REMOVE_GENERAL_MESSAGE',
                  messageIndex: idx,
                });
                selectMessage(undefined);
                selectSection(undefined);
              }}
            />
            {newGeneralMessagePrompt(idx + 1)}
          </React.Fragment>
        ))}

        <h2 className={styles.issueSectionHeader}>Amendments</h2>
        {newAmendmentMessagePrompt(0)}
        {[...issue.amendments.messages.entries()].map(([idx, msg]: [number, Message]) => (
          <React.Fragment>
            <MessageItem
              selected={msg == selectedMessage && selectedSection === 'amendments'}
              message={msg}
              onSelect={() => { selectMessage(msg); selectSection("amendments"); }}
              onDelete={() => {
                wsIssue.dispatch({
                  type: 'REMOVE_AMENDMENT_MESSAGE',
                  messageIndex: idx,
                });
                selectMessage(undefined);
                selectSection(undefined);
              }}
            />
            {newAmendmentMessagePrompt(idx + 1)}
          </React.Fragment>
        ))}

      </div>
      <div className={styles.selectedMessagePane}>
        {selectedMessage
          ? <MessageEditor
              workspace={ws}
              message={selectedMessage}
              issue={issue}
              onChange={(updatedMessage: any) => {
                if (selectedSection === "general") {
                  wsIssue.dispatch({
                    type: 'EDIT_GENERAL_MESSAGE',
                    messageIndex: issue.general.messages.indexOf(selectedMessage as Message),
                    messageData: updatedMessage,
                  });
                } else if (selectedSection === "amendments") {
                  wsIssue.dispatch({
                    type: 'EDIT_AMENDMENT_MESSAGE',
                    messageIndex: issue.amendments.messages.indexOf(selectedMessage as Message),
                    messageData: updatedMessage,
                  });
                }
                selectMessage(updatedMessage);
              }}
            />
          : null
        }
      </div>
    </div>
  )
}


function MessageEditor(props: any) {
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
    throw new Error("MessageEditor received no message");
  }
  return null;
}


interface NewMessagePromptProps {
  menu: JSX.Element,
}
export function NewMessagePrompt(props: NewMessagePromptProps) {
  return (
    <Popover
        wrapperTagName={'div'}
        targetTagName={'div'}
        className={styles.addMessageTriggerContainer}
        content={props.menu}>
      <Button icon="plus" className={styles.addMessageTrigger} />
    </Popover>
  )
}
