import React from 'react';
import { SimpleEditableCard } from 'sse/renderer/widgets/editable-card-list';
import { Message } from 'models/messages';
import { MessageTitle } from '../message-editor';


interface MessageItemProps {
  selected: boolean,
  message: Message,
  onSelect: () => void,
  onDelete: () => void,
}
export function MessageItem(props: MessageItemProps) {
  return (
    <SimpleEditableCard
        minimal={true}
        selected={props.selected}
        icon="clipboard"
        onDelete={props.onDelete}
        onSelect={props.onSelect}>
      <MessageTitle message={props.message} />
    </SimpleEditableCard>
  );
};
