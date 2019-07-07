import * as React from 'react';
import { useState } from 'react';
import { Text, Card, Button, Popover, Menu } from '@blueprintjs/core';
import { Storage, Workspace } from 'renderer/app/storage';
import { QuerySet } from 'renderer/app/storage/query';
import { useTimeTravel, TimeTravel } from 'renderer/app/useTimeTravel';
import { Message, MessageType, OBIssue } from 'renderer/app/issues/models';
import {
  getMessageEditor,
  getMessageTypeTitle,
  createMessage,
} from './message-templates';
import * as styles from './styles.scss';


const MESSAGE_TYPES: MessageType[] = [
  'custom',
  'amendment',
]
const MESSAGE_TYPES_ALLOWED_ONCE_PER_ISSUE: MessageType[] = [
  'approved_recommendations',
  'running_annexes',
  'service_restrictions',
  'callback_procedures',
]


function reducer(state: Workspace, action: any) {
  switch (action.type) {
    case 'ADD_GENERAL_MESSAGE':
      if (!state.issues[action.id]) {
        break;
      }
      state.issues[action.id].general.messages.splice(action.newMessageIndex, 0, action.message);
      break;

    case 'EDIT_GENERAL_MESSAGE':
      if (!state.issues[action.id]) {
        break;
      }
      state.issues[action.id].general.messages[action.messageIndex] = {
        ...state.issues[action.id].general.messages[action.messageIndex],
        ...action.messageData,
      };
      break;

    case 'REMOVE_GENERAL_MESSAGE':
      state.issues[action.id].general.messages.splice(action.messageIndex, 1);
      break;

    case 'ADD_RECOMMENDATION':
      break;

    case 'ADD_LIST':
      break;
  }
}


interface IssueEditorProps {
  storage: Storage,
  issueId: string,
}
export function IssueEditor(props: IssueEditorProps) {
  const tt: TimeTravel = useTimeTravel(props.storage, reducer, props.storage.workspace);
  const issues = new QuerySet<OBIssue>(tt.state.issues);
  const issue: OBIssue = issues.get(props.issueId);

  let initialMessage: Message | undefined = undefined;
  if (issue.general.messages.length > 0) {
    initialMessage = issue.general.messages[0];
  }
  const [ selectedMessage, selectMessage ] = useState(initialMessage);

  var availableNewMessageTypes = [...MESSAGE_TYPES];
  for (const messageType of MESSAGE_TYPES_ALLOWED_ONCE_PER_ISSUE) {
    if (issue.general.messages.filter(msg => msg.type === messageType).length < 1) {
      availableNewMessageTypes.push(messageType);
    }
  }

  function newMessagePrompt(idx: number) {
    return (
      <NewMessagePrompt
        availableTypes={availableNewMessageTypes}
        onCreate={(type) => {
          const newMessage = createMessage(type);
          tt.dispatch({
            type: 'ADD_GENERAL_MESSAGE',
            id: issue.id,
            message: newMessage,
            newMessageIndex: idx,
          });
          setTimeout(() => {
            selectMessage(newMessage);
          }, 100);
        }}
      />
    );
  }

  return (
    <div className={styles.twoPaneEditor}>
      <div className={styles.messageListPane}>
        <h2 className={styles.issueSectionHeader}>General</h2>

        {newMessagePrompt(0)}

        {[...issue.general.messages.entries()].map(([idx, msg]: [number, Message]) => (
          <React.Fragment>
            <MessageItem
              selected={msg == selectedMessage}
              message={msg}
              onSelect={() => selectMessage(msg)}
              onDelete={() => {
                tt.dispatch({
                  type: 'REMOVE_GENERAL_MESSAGE',
                  id: issue.id,
                  messageIndex: idx,
                });
                selectMessage(undefined);
              }}
            />
            {newMessagePrompt(idx + 1)}
          </React.Fragment>
        ))}
      </div>
      <div className={styles.selectedMessagePane}>
        {selectedMessage
          ? <MessageEditor
              workspace={tt.state}
              message={selectedMessage}
              onChange={(updatedMessage: any) => tt.dispatch({
                type: 'EDIT_GENERAL_MESSAGE',
                id: issue.id,
                messageIndex: issue.general.messages.indexOf(selectedMessage),
                messageData: updatedMessage,
              })}
            />
          : null
        }
      </div>
    </div>
  )
}


interface MessageItemProps {
  selected: boolean,
  message: Message,
  onSelect: () => void,
  onDelete: () => void,
}
function MessageItem(props: MessageItemProps) {
  return (
    <Card
        className={`${styles.messageListItem} ${props.selected ? styles.selectedMessageListItem : ''}`}
        onClick={props.onSelect}>
      <Text ellipsize={true}>
        {getMessageTypeTitle(props.message.type)}
      </Text>
      <Button
        onClick={(evt: any) => {
          props.onDelete();
          evt.stopPropagation();
          return false;
        }}
        intent="danger"
        icon="cross"
        className={styles.messageListItemDelete}
        minimal={true}
        small={true}
      />
    </Card>
  )
}


function MessageEditor(props: any) {
  const MessageEditor = getMessageEditor(props.message);
  return MessageEditor(props);
}


interface NewMessagePromptProps {
  availableTypes: MessageType[],
  onCreate: (type: MessageType) => void,
}
export function NewMessagePrompt(props: NewMessagePromptProps) {
  const messageTypeMenu = (
    <Menu>
      <Menu.Divider title="Add new issue" />

      {props.availableTypes.map(type => (
        <Menu.Item
          key={type}
          shouldDismissPopover={true}
          text={getMessageTypeTitle(type)}
          onClick={() => props.onCreate(type)}
        />
      ))}
    </Menu>
  )
  return (
    <Popover
        wrapperTagName={'div'}
        targetTagName={'div'}
        className={styles.addMessageTriggerContainer}
        content={messageTypeMenu}>
      <Card className={styles.addMessageTriggerCard}>
        &nbsp;
      </Card>
    </Popover>
  )
}
