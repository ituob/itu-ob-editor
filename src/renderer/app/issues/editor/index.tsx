import React, { useState } from 'react';

import { Workspace } from 'main/storage';
import { OBIssue } from 'main/issues/models';
import { Message } from 'main/issues/messages';

import { useWorkspace, useWorkspaceRO } from 'renderer/app/storage/api';
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
  const wsIssue = useWorkspace<OBIssue | {}>('issue', reducer, {}, props.issueId);
  const maybeIssue = wsIssue.state;

  const ws = useWorkspaceRO<Workspace>(
    'all',
    { issues: {}, publications: {}, recommendations: {} },
    false);

  var initialMessage: number | undefined = undefined;
  var initialSection: "amendments" | "general" = "general";

  if (Object.keys(maybeIssue).length < 1) {
    // Silence React hooks :(
    useState(initialMessage);
    useState(initialSection);

    return <p>Loading…</p>;
  }

  const issue = maybeIssue as OBIssue;

  if (issue.general.messages.length > 0) {
    initialMessage = 0;
    initialSection = "general";
  } else if (issue.amendments.messages.length > 0) {
    initialMessage = 0;
    initialSection = "amendments";
  }

  const [ selectedMessage, selectMessage ] = useState(initialMessage);
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

        <h2 className={styles.issueSectionHeader}>General</h2>
        <NewGeneralMessagePrompt idx={0} issue={issue} handleNewMessage={handleNewGeneralMessage} />
        {[...issue.general.messages.entries()].map(([idx, msg]: [number, Message]) => (
          <React.Fragment>
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
          </React.Fragment>
        ))}

        <h2 className={styles.issueSectionHeader}>Amendments</h2>
        <NewAmendmentPrompt
          idx={0}
          issue={issue}
          issueIndex={ws.issues}
          publicationIndex={ws.publications}
          handleNewMessage={handleNewAmendment} />
        {[...issue.amendments.messages.entries()].map(([idx, msg]: [number, Message]) => (
          <React.Fragment>
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
          </React.Fragment>
        ))}

      </div>
      <div className={styles.selectedMessagePane}>
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
