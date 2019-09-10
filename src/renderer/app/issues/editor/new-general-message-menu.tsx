import React from 'react';
import { Popover, Button, Menu } from '@blueprintjs/core';

import { OBIssue } from 'main/issues/models';
import { Message, MessageType } from 'main/issues/messages';

import { NewMessagePromptProps } from './message-editor';
import { obMessageTypes } from 'main';
import * as styles from './styles.scss';


export const NewGeneralMessagePrompt: React.FC<NewMessagePromptProps> = function (props) {
  return (
    <Popover
      wrapperTagName={'div'}
      targetTagName={'div'}
      className={styles.addMessageTriggerContainer}
      content={
        <NewGeneralMessageMenu
          issue={props.issue}
          onCreate={(msg: Message) => props.handleNewMessage(msg, props.idx)}
        />
      }
    ><Button icon="plus" className={styles.addMessageTrigger} /></Popover>
  );
};


interface NewGeneralMessageMenuProps {
  issue: OBIssue,
  onCreate: (message: Message) => void,
}
const NewGeneralMessageMenu: React.FC<NewGeneralMessageMenuProps> = function (props) {
  const existing: Message[] = props.issue.general.messages;

  function alreadyExists(type: MessageType) {
    return existing.filter(msg => msg.type === type).length > 0;
  }

  return (
    <Menu className={styles.newMessageMenu}>
      <Menu.Divider title="Insert message here" />

      <Menu.Item
        key="telephone_service"
        text={obMessageTypes.getPlugin('telephone_service_2').promptTitle}
        onClick={() => props.onCreate({
          type: 'telephone_service_2',
          contents: [],
        })}
      />
      <Menu.Item
        key="custom"
        text={obMessageTypes.getPlugin('custom').promptTitle}
        onClick={() => props.onCreate({
          type: 'custom',
          contents: {},
        })}
      />

      <Menu.Divider />
      <Menu.Item
        key="service_restrictions"
        text={obMessageTypes.getPlugin('service_restrictions').promptTitle}
        disabled={alreadyExists('service_restrictions')}
        onClick={() => props.onCreate({
          type: 'service_restrictions',
          items: [],
        })}
      />
      <Menu.Item
        key="callback_procedures"
        text={obMessageTypes.getPlugin('callback_procedures').promptTitle}
        disabled={alreadyExists('callback_procedures')}
        onClick={() => props.onCreate({
          type: 'callback_procedures',
        })}
      />

      <Menu.Divider />
      <Menu.Item
        key="approved_recommendations"
        text={obMessageTypes.getPlugin('approved_recommendations').promptTitle}
        disabled={alreadyExists('approved_recommendations')}
        onClick={() => props.onCreate({
          type: 'approved_recommendations',
          items: {},
        })}
      />
      <Menu.Item
        key="running_annexes"
        text={obMessageTypes.getPlugin('running_annexes').promptTitle}
        disabled={existing.filter(msg => msg.type === 'running_annexes').length > 0}
        onClick={() => props.onCreate({
          type: 'running_annexes',
          extra_links: [],
        })}
      />
    </Menu>
  );
};
