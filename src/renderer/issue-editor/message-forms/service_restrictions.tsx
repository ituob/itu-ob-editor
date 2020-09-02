import React, { useState, useContext } from 'react';
import { Label, Button, InputGroup } from '@blueprintjs/core';

import { AddCardTrigger, SimpleEditableCard } from '@riboseinc/coulomb/renderer/widgets';
import { LangConfigContext } from '@riboseinc/coulomb/localizer/renderer/context';

import { Message as ServiceRestrictionsMessage, SRItem } from 'models/messages/service_restrictions';

import { MessageFormProps, MessageEditorDialog } from '../message-editor';


export const MessageForm: React.FC<MessageFormProps> = function ({ message, onChange }) {
  const initialItems = (message as ServiceRestrictionsMessage).items;

  const lang = useContext(LangConfigContext);

  const [items, updateItems] = useState(initialItems);
  const [activeItemIdx, setActiveItemIdx] = useState(0);
  const [newItemDialogState, toggleNewItemDialogState] = useState(false);

  function _onChange(newItems: SRItem[]) {
    onChange(Object.assign({}, (message as ServiceRestrictionsMessage), { items: newItems }));
  }

  return (
    <>
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
                  const newItems = [...items]
                  newItems.splice(idx, 1);
                  updateItems(newItems);
                  _onChange(newItems);
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
              var newItems = [...items];
              newItems.splice(activeItemIdx, 0, item);
              updateItems(newItems);
              _onChange(newItems);
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
