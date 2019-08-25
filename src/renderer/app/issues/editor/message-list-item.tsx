import React from 'react';
import { Text, Card, Button } from '@blueprintjs/core';
import { Message } from 'main/issues/messages';
import { getMessageTypeTitle, getMessageSubtitle } from './messages';
import * as styles from './styles.scss';


interface MessageItemProps {
  selected: boolean,
  message: Message,
  onSelect: () => void,
  onDelete: () => void,
}
export function MessageItem(props: MessageItemProps) {
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
