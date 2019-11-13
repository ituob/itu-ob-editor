import React from 'react';
import { PaneHeader } from 'sse/renderer/widgets/pane-header';
import { Message } from 'models/messages';

import { MessageItem } from './item';


interface MessageListProps {
  title: string,
  issueId: number,
  items: Message[],
  selectedIdx: number | undefined,
  onDelete: (idx: number) => void,
  onSelect: (idx: number) => void,
  prompt: (idx: number, highlight?: boolean) => JSX.Element,
  className?: string,
}
export const MessageList: React.FC<MessageListProps> = function(props) {
  return (
    <div className={props.className}>
      <PaneHeader align="left">{props.title}</PaneHeader>
      {props.prompt(0, props.items.length < 1)}

      {[...props.items.entries()].map(([idx, msg]: [number, Message]) => (
        <>
          <MessageItem
            message={msg}
            selected={props.selectedIdx === idx}
            onSelect={() => props.onSelect(idx)}
            onDelete={() => props.onDelete(idx)}
          />
          {props.prompt(idx + 1)}
        </>
      ))}
    </div>
  );
};
