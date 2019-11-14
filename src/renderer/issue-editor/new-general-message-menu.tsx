import React from 'react';
import { Position, Popover, Menu } from '@blueprintjs/core';

import { AddCardTriggerButton } from 'sse/renderer/widgets/editable-card-list';
import * as editableCardListStyles from 'sse/renderer/widgets/editable-card-list/styles.scss';

import { Message, MessageType } from 'models/messages';

import { NewMessagePromptProps } from './message-editor';
import * as styles from './styles.scss';


type NewGeneralMessagePromptProps = NewMessagePromptProps & {
  existingMessages: Message[],
}
export const NewGeneralMessagePrompt: React.FC<NewGeneralMessagePromptProps> = function (props) {
  return (
    <Popover
      wrapperTagName={'div'}
      targetTagName={'div'}
      className={editableCardListStyles.addCardTriggerContainer}
      position={Position.RIGHT}
      boundary="viewport"
      minimal={true}
      content={
        <NewGeneralMessageMenu
          existing={props.existingMessages}
          onCreate={(msg: Message) => props.onCreate(msg)}
        />
      }
    ><AddCardTriggerButton highlight={props.highlight} label="Add a general message" /></Popover>
  );
};


interface NewGeneralMessageMenuProps {
  existing: Message[],
  onCreate: (message: Message) => void,
}
const NewGeneralMessageMenu: React.FC<NewGeneralMessageMenuProps> = function (props) {
  function alreadyExists(type: MessageType) {
    return props.existing.filter(msg => msg.type === type).length > 0;
  }

  return (
    <Menu className={styles.newMessageMenu}>
      <Menu.Divider title="Insert message" />

      <Menu.Item
        key="telephone_service"
        text="Telephone Service"
        disabled={alreadyExists('telephone_service') || alreadyExists('telephone_service_2')}
        onClick={() => props.onCreate({
          type: 'telephone_service_2',
          contents: [],
        })}
      />
      <Menu.Item
        key="service_restrictions"
        text="Service restrictions"
        disabled={alreadyExists('service_restrictions')}
        onClick={() => props.onCreate({
          type: 'service_restrictions',
          items: [],
        })}
      />
      <Menu.Item
        key="callback_procedures"
        text="Callback Procedures"
        disabled={alreadyExists('callback_procedures')}
        onClick={() => props.onCreate({
          type: 'callback_procedures',
        })}
      />
      <Menu.Item
        key="approved_recommendations"
        text="Approved Recommendations"
        disabled={alreadyExists('approved_recommendations')}
        onClick={() => props.onCreate({
          type: 'approved_recommendations',
          items: {},
        })}
      />
      <Menu.Item
        key="running_annexes"
        text="Running Annexes"
        disabled={alreadyExists('running_annexes')}
        onClick={() => props.onCreate({
          type: 'running_annexes',
          extra_links: [],
        })}
      />

      <Menu.Divider />

      <Menu.Item
        key="custom"
        text="Custom message…"
        onClick={() => props.onCreate({
          type: 'custom',
          title: { en: '' },
          recommendation: null,
          contents: { en: {} },
        })}
      />
    </Menu>
  );
};
