import React, { useState, useContext } from 'react';
import { Label, Button, InputGroup } from '@blueprintjs/core';

import { AddCardTrigger, SimpleEditableCard } from 'sse/renderer/widgets/editable-card-list';
import { PaneHeader } from 'sse/renderer/widgets/pane-header';
import { LangConfigContext } from 'sse/localizer/renderer';

import { ServiceRestrictionsMessage, SRItem } from 'models/messages/service_restrictions';

import { MessageEditorProps, MessageEditorDialog } from '../message-editor';


export const MessageEditor: React.FC<MessageEditorProps> = function ({ message, onChange }) {
  const initialItems = (message as ServiceRestrictionsMessage).items;

  const lang = useContext(LangConfigContext);

  const [items, updateItems] = useState(initialItems);
  const [activeItemIdx, setActiveItemIdx] = useState(0);
  const [newItemDialogState, toggleNewItemDialogState] = useState(false);

  function _onChange() {
    onChange(Object.assign({}, (message as ServiceRestrictionsMessage), { items: items }));
  }

  return (
    <>
      <PaneHeader align="left">Service Restrictions</PaneHeader>
      <>
        <AddCardTrigger
          key="addFirstItem"
          highlight={items.length < 1}
          label="Add a service restrictions item"
          onClick={() => {
            setActiveItemIdx(0);
            toggleNewItemDialogState(true);
          }} />
        {items.map((item: SRItem, idx: number) => (
          <>
            <SimpleEditableCard
                key="item"
                onDelete={() => {
                  updateItems(items => { items.splice(idx, 1); return items; })
                  _onChange();
                }}>
              <strong>{item.country[lang.default]}</strong>
              &emsp;
              OB No. {item.ob},
              p. {item.page}
            </SimpleEditableCard>

            <AddCardTrigger
              key="addItem"
              label="Add a service restrictions item"
              onClick={() => {
                setActiveItemIdx(idx + 1);
                toggleNewItemDialogState(true);
              }} />
          </>
        ))}
      </>

      {newItemDialogState === true 
        ? <AddSRItemDialog
            key="addItem"
            title="Add Service Restrictions item"
            isOpen={true}
            onClose={() => toggleNewItemDialogState(false)}
            onSave={(item: SRItem) => {
              updateItems(items => { items.splice(activeItemIdx, 0, item); return items });
              _onChange();
              toggleNewItemDialogState(false);
            }}
          />
        : ''}
    </>
  );
};


interface AddSRItemDialogProps {
  isOpen: boolean,
  title: string,
  onSave: (item: SRItem) => void,
  onClose: () => void,
}
const AddSRItemDialog: React.FC<AddSRItemDialogProps> = function ({ isOpen, title, onSave, onClose }) {
  const lang = useContext(LangConfigContext);

  const [country, setCountry] = useState('');
  const [ob, setOb] = useState(undefined as number | undefined);
  const [page, setPage] = useState(undefined as number | undefined);

  function _onSave() {
    if (ob !== undefined && page !== undefined && country !== '') {
      onSave({
        country: { [lang.default]: country },
        ob: ob as number,
        page: page as number,
      });
      onClose();
    }
  }

  return (
    <MessageEditorDialog
        title={title}
        isOpen={isOpen}
        onClose={onClose}
        saveButton={
          <Button
            intent="primary"
            disabled={ob === undefined || page === undefined || country === ''}
            onClick={_onSave}>Add item</Button>
        }>
      <Label key="country">
        Country name
        <InputGroup
          value={country}
          type="text"
          large={true}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setCountry((evt.target as HTMLInputElement).value as string);
          }}
        />
      </Label>
      <Label key="ob">
        OB edition number
        <InputGroup
          value={ob ? ob.toString() : ''}
          type="number"
          large={true}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setOb(parseInt((evt.target as HTMLInputElement).value, 10));
          }}
        />
      </Label>
      <Label key="page">
        Page number
        <InputGroup
          value={page ? page.toString() : ''}
          type="number"
          large={true}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setPage(parseInt((evt.target as HTMLInputElement).value, 10));
          }}
        />
      </Label>
    </MessageEditorDialog>
  );
};
