import React from 'react';
import { SimpleEditableCard } from 'sse/renderer/widgets/editable-card-list';
import { Message, getMessageTitle } from 'models/messages';


interface MessageItemProps {
  selected: boolean,
  message: Message,
  onSelect: () => void,
  onDelete: () => void,
}
export function MessageItem(props: MessageItemProps) {
  return (
    <SimpleEditableCard
        selected={props.selected}
        onSelect={props.onSelect}
        onDelete={props.onDelete}>
      {getMessageTitle(props.message)}
    </SimpleEditableCard>
  );
};
