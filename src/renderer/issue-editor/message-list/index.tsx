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
  promptPosition?: 'all' | 'start' | 'end',
  className?: string,
}
export const MessageList: React.FC<MessageListProps> = function(props) {
  return (
    <div className={props.className}>
      <PaneHeader minor={true} align="left">{props.title}</PaneHeader>

      {props.promptPosition && ['all', 'start'].indexOf(props.promptPosition) >= 0
        ? props.prompt(0, props.items.length < 1)
        : null}

      {[...props.items.entries()].map(([idx, msg]: [number, Message]) => (
        <>
          <MessageItem
            message={msg}
            selected={props.selectedIdx === idx}
            onSelect={() => props.onSelect(idx)}
            onDelete={() => props.onDelete(idx)}
          />

          {props.promptPosition === 'all'
            ? props.prompt(idx + 1, props.items.length < 1)
            : null}
        </>
      ))}

      {props.promptPosition === 'end'
        ? props.prompt(props.items.length, true)
        : null}

    </div>
  );
};
