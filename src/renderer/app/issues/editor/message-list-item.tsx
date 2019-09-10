import React from 'react';
import { Text, Card, Button } from '@blueprintjs/core';
import { Message } from 'main/issues/messages';
import { obMessageTypes } from 'main';
import * as styles from './styles.scss';


interface MessageItemProps {
  selected: boolean,
  message: Message,
  onSelect: () => void,
  onDelete: () => void,
}
export function MessageItem(props: MessageItemProps) {
  const msgLabel = obMessageTypes.getPlugin(props.message.type).getLabel(props.message);

  return (
    <Card
        className={`${styles.messageListItem} ${props.selected ? styles.selectedMessageListItem : ''}`}
        onClick={props.onSelect}>

      <Text ellipsize={true}>
        <span title={msgLabel.tooltip}>
          {msgLabel.text}
          &emsp;
          {msgLabel.suffix
            ? <small>{msgLabel.suffix}</small>
            : ''}
        </span>
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
