import React, { useState } from 'react';
import { Button, Popover } from '@blueprintjs/core';
import { Storage } from 'renderer/app/storage';
import { useTimeTravel, TimeTravel } from 'renderer/app/useTimeTravel';
import { QuerySet } from 'renderer/app/storage/query';
import { Message, AmendmentMessage, OBIssue } from 'renderer/app/issues/models';
import { getMessageEditor } from './message-templates';
import { NewGeneralMessageMenu } from './new-general-message-menu';
import { NewAmendmentMessageMenu } from './new-amendment-menu';
import { MessageItem } from './message-list-item';
import { reducer } from './reducer';
import * as styles from './styles.scss';


interface IssueEditorProps {
  storage: Storage,
  issueId: string,
}
export function IssueEditor(props: IssueEditorProps) {
  const tt: TimeTravel = useTimeTravel(props.storage, reducer, props.storage.workspace);
  const issues = new QuerySet<OBIssue>(tt.state.issues);
  const issue: OBIssue = issues.get(props.issueId);

  let initialMessage: Message | undefined = undefined;
  let initialSection: "amendments" | "general" | undefined = undefined;

  if (issue.general.messages.length > 0) {
    initialMessage = issue.general.messages[0];
    initialSection = "general"
  } else if (issue.amendments.messages.length > 0) {
    initialMessage = issue.amendments.messages[0];
    initialSection = "amendments"
  }

  const [ selectedMessage, selectMessage ] = useState(initialMessage);
  const [ selectedSection, selectSection ] = useState(initialSection);

  function newGeneralMessagePrompt(idx: number) {
    return (
      <NewMessagePrompt menu={
        <NewGeneralMessageMenu
          issue={issue}
          onCreate={(msg) => {
            tt.dispatch({
              type: 'ADD_GENERAL_MESSAGE',
              id: issue.id,
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
          issueIndex={tt.state.issues}
          publicationIndex={tt.state.publications}
          onCreate={(msg: AmendmentMessage) => {
            tt.dispatch({
              type: 'ADD_AMENDMENT_MESSAGE',
              id: issue.id,
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
                tt.dispatch({
                  type: 'REMOVE_GENERAL_MESSAGE',
                  id: issue.id,
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
                tt.dispatch({
                  type: 'REMOVE_AMENDMENT_MESSAGE',
                  id: issue.id,
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
              workspace={tt.state}
              message={selectedMessage}
              issue={issue}
              onChange={(updatedMessage: any) => {
                if (selectedSection === "general") {
                  tt.dispatch({
                    type: 'EDIT_GENERAL_MESSAGE',
                    id: issue.id,
                    messageIndex: issue.general.messages.indexOf(selectedMessage as Message),
                    messageData: updatedMessage,
                  });
                } else if (selectedSection === "amendments") {
                  tt.dispatch({
                    type: 'EDIT_AMENDMENT_MESSAGE',
                    id: issue.id,
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
