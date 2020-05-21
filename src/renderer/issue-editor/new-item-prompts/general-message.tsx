import React from 'react';
import { Position, Popover, Menu } from '@blueprintjs/core';

import { AddCardTriggerButton } from 'coulomb/renderer/widgets/editable-card-list';
import * as editableCardListStyles from 'coulomb/renderer/widgets/editable-card-list/styles.scss';

import { Message, MessageType } from 'models/messages';

import { NewItemPromptProps } from 'renderer/widgets/item-list/new-item-menu';
import * as styles from '../styles.scss';


type NewGeneralMessagePromptProps = NewItemPromptProps & {
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
    <Menu className={styles.newItemMenu}>
      <Menu.Divider title="Insert message" />

      <Menu.Item
        key="running_annexes"
        text="Running Annexes"
        disabled={alreadyExists('running_annexes')}
        onClick={() => props.onCreate({ type: 'running_annexes', extra_links: [] })}
      />
      <Menu.Item
        key="approved_recommendations"
        text="Approved Recommendations"
        disabled={alreadyExists('approved_recommendations')}
        onClick={() => props.onCreate({ type: 'approved_recommendations', items: {} })}
      />
      <Menu.Item
        key="telephone_service"
        text="Telephone Service"
        disabled={alreadyExists('telephone_service') || alreadyExists('telephone_service_2')}
        onClick={() => props.onCreate({ type: 'telephone_service_2', contents: [] })}
      />
      <Menu.Item
        key="sanc"
        text="Assignment of Signalling Area/Network Codes (SANC)"
        onClick={() => props.onCreate({ type: 'sanc', contents: [] })}
      />
      <Menu.Item
        key="iptn"
        text="The International Public Telecommunication Numbering Plan"
        onClick={() => props.onCreate({ type: 'iptn', contents: [] })}
      />
      <Menu.Item
        key="ipns"
        text="International Identification Plan for Public Networks and Subscriptions"
        onClick={() => props.onCreate({ type: 'ipns', contents: [] })}
      />
      <Menu.Item
        key="mid"
        text="Maritime Identification Digits"
        onClick={() => props.onCreate({ type: 'mid', contents: [] })}
      />
      <Menu.Item
        key="org_changes"
        text="Changes in Administrations/ROAs and other entities or Organizations"
        onClick={() => props.onCreate({ type: 'org_changes', contents: [] })}
      />
      <Menu.Item
        key="misc_communications"
        text="Misc. communications"
        onClick={() => props.onCreate({ type: 'misc_communications', contents: [] })}
      />
      <Menu.Item
        key="service_restrictions"
        text="Service restrictions"
        disabled={alreadyExists('service_restrictions')}
        onClick={() => props.onCreate({ type: 'service_restrictions', items: [] })}
      />
      <Menu.Item
        key="callback_procedures"
        text="Callback Procedures"
        disabled={alreadyExists('callback_procedures')}
        onClick={() => props.onCreate({ type: 'callback_procedures' })}
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
