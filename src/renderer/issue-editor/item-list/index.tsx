import React from 'react';
import { IconName } from '@blueprintjs/core';
import { PaneHeader } from 'coulomb/renderer/widgets/pane-header';
import { SimpleEditableCard } from 'coulomb/renderer/widgets/editable-card-list';


interface ItemListProps {
  title: string,
  items: any[],
  selectedIdx: string | undefined,

  onDelete: (idx: string) => void,
  onSelect: (idx: string) => void,

  itemTitle: (item: unknown, idx: string) => JSX.Element,
  itemIcon?: (item: unknown) => IconName,

  prompt: (highlight?: boolean) => JSX.Element,

  className?: string,
}
export const ItemList: React.FC<ItemListProps> = function(props) {
  return (
    <div className={props.className}>
      <PaneHeader minor={true} align="left">{props.title}</PaneHeader>

      {[...Object.entries(props.items)].map(([idx, item]: [string, unknown]) => (
        <SimpleEditableCard
            key={idx}
            minimal={true}
            selected={props.selectedIdx === idx}
            icon={props.itemIcon ? props.itemIcon(item) : "document"}
            onDelete={() => props.onDelete(idx)}
            onSelect={() => props.onSelect(idx)}>
          {props.itemTitle(item, idx)}
        </SimpleEditableCard>
      ))}

      {props.prompt(true)}

    </div>
  );
};
