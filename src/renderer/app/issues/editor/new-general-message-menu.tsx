import React from 'react';
import { Menu } from '@blueprintjs/core';
import { Message, MessageType, OBIssue } from 'renderer/app/issues/models';
import { getMessageTypeTitle } from './message-templates';
import * as styles from './styles.scss';


interface NewGeneralMessageMenuProps {
  issue: OBIssue,
  onCreate: (message: Message) => void,
}
export function NewGeneralMessageMenu(props: NewGeneralMessageMenuProps) {
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
