import React, { useState } from 'react';
import { Text, Card, Button, Popover, Menu } from '@blueprintjs/core';
import { Storage } from 'renderer/app/storage';
import { useTimeTravel, TimeTravel } from 'renderer/app/useTimeTravel';
import { Index, QuerySet } from 'renderer/app/storage/query';
import { Message, AmendmentMessage, MessageType, OBIssue } from 'renderer/app/issues/models';
import { Publication } from 'renderer/app/lists/models';
import { RunningAnnex, getRunningAnnexesForIssue } from '../running-annexes';
import { getMessageEditor, getMessageTypeTitle, getMessageSubtitle } from './message-templates';
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

  let initialMessage: {
    msg: Message | undefined,
    section: "amendments" | "general" | undefined,
  } = { msg: undefined, section: undefined };

  if (issue.general.messages.length > 0) {
    initialMessage = { msg: issue.general.messages[0], section: "general" };
  } else if (issue.amendments.messages.length > 0) {
    initialMessage = { msg: issue.amendments.messages[0], section: "amendments" };
  }
  const [ selectedMessage, selectMessage ] = useState(initialMessage);

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
              selectMessage({ msg: msg, section: "general" });
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
              selectMessage({ msg: msg, section: "amendments" });
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
              selected={msg == selectedMessage.msg}
              message={msg}
              onSelect={() => selectMessage({ msg: msg, section: "general" })}
              onDelete={() => {
                tt.dispatch({
                  type: 'REMOVE_GENERAL_MESSAGE',
                  id: issue.id,
                  messageIndex: idx,
                });
                selectMessage({ msg: undefined, section: undefined });
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
              selected={msg == selectedMessage.msg}
              message={msg}
              onSelect={() => selectMessage({ msg: msg, section: "amendments" })}
              onDelete={() => {
                tt.dispatch({
                  type: 'REMOVE_AMENDMENT_MESSAGE',
                  id: issue.id,
                  messageIndex: idx,
                });
                selectMessage({ msg: undefined, section: undefined });
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
              message={selectedMessage.msg}
              issue={issue}
              onChange={(updatedMessage: any) => {
                if (selectedMessage.section === "general") {
                  tt.dispatch({
                    type: 'EDIT_GENERAL_MESSAGE',
                    id: issue.id,
                    messageIndex: issue.general.messages.indexOf(selectedMessage.msg as Message),
                    messageData: updatedMessage,
                  });
                } else if (selectedMessage.section === "amendments") {
                  tt.dispatch({
                    type: 'EDIT_AMENDMENT_MESSAGE',
                    id: issue.id,
                    messageIndex: issue.amendments.messages.indexOf(selectedMessage.msg as Message),
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


interface MessageItemProps {
  selected: boolean,
  message: Message,
  onSelect: () => void,
  onDelete: () => void,
}
function MessageItem(props: MessageItemProps) {
  const subtitle = getMessageSubtitle(props.message);
  return (
    <Card
        className={`${styles.messageListItem} ${props.selected ? styles.selectedMessageListItem : ''}`}
        onClick={props.onSelect}>
      <Text ellipsize={true}>
        {getMessageTypeTitle(props.message.type)}
        &emsp;
        <small>{subtitle}</small>
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
  if (props.message) {
    const MessageEditor = getMessageEditor(props.message);
    return MessageEditor(props);
  } else {
    throw new Error("MessageEditor received no message");
  }
  return null;
}


interface NewGeneralMessageMenuProps {
  issue: OBIssue,
  onCreate: (message: Message) => void,
}
function NewGeneralMessageMenu(props: NewGeneralMessageMenuProps) {
  const existing: Message[] = props.issue.general.messages;

  function alreadyExists(type: MessageType) {
    return existing.filter(msg => msg.type === type).length > 0;
  }

  return (
    <Menu className={styles.newMessageMenu}>
      <Menu.Divider title="Insert message here" />

      <Menu.Item
        key="telephone_service"
        text={getMessageTypeTitle('telephone_service')}
        onClick={() => props.onCreate({
          type: 'telephone_service',
          contents: {},
        })}
      />
      <Menu.Item
        key="custom"
        text={getMessageTypeTitle('custom')}
        onClick={() => props.onCreate({
          type: 'custom',
          contents: {},
        })}
      />

      <Menu.Divider />
      <Menu.Item
        key="service_restrictions"
        text={getMessageTypeTitle('service_restrictions')}
        disabled={alreadyExists('service_restrictions')}
        onClick={() => props.onCreate({
          type: 'service_restrictions',
          items: [],
        })}
      />
      <Menu.Item
        key="callback_procedures"
        text={getMessageTypeTitle('callback_procedures')}
        disabled={alreadyExists('callback_procedures')}
        onClick={() => props.onCreate({
          type: 'callback_procedures',
        })}
      />

      <Menu.Divider />
      <Menu.Item
        key="approved_recommendations"
        text={getMessageTypeTitle('approved_recommendations')}
        disabled={alreadyExists('approved_recommendations')}
        onClick={() => props.onCreate({
          type: 'approved_recommendations',
          items: {},
        })}
      />
      <Menu.Item
        key="running_annexes"
        text={getMessageTypeTitle('running_annexes')}
        disabled={existing.filter(msg => msg.type === 'running_annexes').length > 0}
        onClick={() => props.onCreate({
          type: 'running_annexes',
          extra_links: [],
        })}
      />
    </Menu>
  );
}


interface NewAmendmentMessageMenuProps {
  issue: OBIssue,
  issueIndex: Index<OBIssue>,
  publicationIndex: Index<Publication>,
  onCreate: (message: AmendmentMessage) => void,
}
function NewAmendmentMessageMenu(props: NewAmendmentMessageMenuProps) {
  const runningAnnexes = getRunningAnnexesForIssue(
    props.issue,
    props.issueIndex,
    props.publicationIndex);

  const annexedPublicationIds = runningAnnexes.map(item => item.publication.id);
  const nonAnnexedPublications = new QuerySet<Publication>(props.publicationIndex).
    filter((item: [string, Publication]) => annexedPublicationIds.indexOf(item[0]) < 0).all();

  function createAmendmentMessage(
      forPublication: Publication,
      atPosition: Date | undefined = undefined) {
    let positionString: string | undefined;
    if (atPosition) {
      positionString: `${atPosition.getFullYear()}-${atPosition.getMonth()}-${atPosition.getDate()}`
    }
    props.onCreate({
      type: 'amendment',
      target: {
        publication: forPublication.id,
        position_on: positionString,
      },
      contents: {},
    });
  }

  return (
    <Menu className={styles.newMessageMenu}>

      {runningAnnexes.length > 0
        ? <React.Fragment>
            <Menu.Divider title="Amend annexed list" />
            {runningAnnexes.map((annex: RunningAnnex) => (
              <Menu.Item
                key={annex.publication.id}
                text={annex.publication.title.en}
                onClick={() => createAmendmentMessage(annex.publication, annex.positionOn)}
                shouldDismissPopover={true}
              />
            ))}
          </React.Fragment>
        : null}

      {nonAnnexedPublications.length > 0
        ? <React.Fragment>
            <Menu.Divider title="Amend another publication" />
            {nonAnnexedPublications.map((pub: Publication) => (
              <Menu.Item
                key={pub.id}
                text={pub.title.en}
                onClick={() => createAmendmentMessage(pub)}
                shouldDismissPopover={true}
              />
            ))}
          </React.Fragment>
        : null}

    </Menu>
  );
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
