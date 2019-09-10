import React, { useState } from 'react';
import { Card, Label, Button, InputGroup, Text } from '@blueprintjs/core';

import { ServiceRestrictionsMessage, SRItem } from 'main/issues/messages/service_restrictions';

import { MessageEditorProps, MessageEditorDialog } from '../message-editor';
import * as styles from '../styles.scss';


export const MessageEditor: React.FC<MessageEditorProps> = function ({ message, onChange }) {
  const initialItems = (message as ServiceRestrictionsMessage).items;

  const [items, updateItems] = useState(initialItems);
  const [activeItemIdx, setActiveItemIdx] = useState(0);
  const [newItemDialogState, toggleNewItemDialogState] = useState(false);

  function _onChange() {
    onChange(Object.assign({}, (message as ServiceRestrictionsMessage), { items: items }));
  }

  return (
    <>
      <h2 className={styles.issueSectionHeader}>Service Restrictions</h2>
      <>
        <AddSRItemPrompt
          key="addFirstItem"
          onOpen={() => {
            setActiveItemIdx(0);
            toggleNewItemDialogState(true);
          }}
        />
        {items.map((item: SRItem, idx: number) => (
          <Card key={idx}>
            <Text ellipsize={true}>
              {item.country}
              —
              {item.ob}
              —
              {item.page}
            </Text>
          </Card>
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


interface AddSRItemPromptProps {
  onOpen: () => void,
}
const AddSRItemPrompt: React.FC<AddSRItemPromptProps> = function ({ onOpen }) {
  return (
    <Button
      className={styles.addCountryTrigger}
      minimal={true}
      intent="primary"
      icon="plus"
      onClick={onOpen} />
  );
};


interface AddSRItemDialogProps {
  isOpen: boolean,
  title: string,
  onSave: (item: SRItem) => void,
  onClose: () => void,
}
const AddSRItemDialog: React.FC<AddSRItemDialogProps> = function ({ isOpen, title, onSave, onClose }) {
  //const initialOb: number | null = null;
  // const initialPage: number | null = null;

  const [country, setCountry] = useState('');
  const [ob, setOb] = useState(undefined as number | undefined);
  const [page, setPage] = useState(undefined as number | undefined);

  function _onSave() {
    if (ob !== undefined && page !== undefined && country !== '') {
      onSave({ country, ob: ob as number, page: page as number });
      onClose();
    }
  }

  return (
    <MessageEditorDialog
        title={title}
        isOpen={isOpen}
        onClose={onClose}
        width="95vw"
        saveButton={
          <Button
            intent="primary"
            disabled={ob === undefined || page === undefined || country === ''}
            onClick={_onSave}>Add item</Button>
        }>
      <Label>
        Country name
        <InputGroup
          value={country}
          key="country"
          type="text"
          large={true}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setCountry((evt.target as HTMLInputElement).value as string);
          }}
        />
      </Label>
      <Label>
        OB edition number
        <InputGroup
          value={ob ? ob.toString() : ''}
          key="ob"
          type="number"
          large={true}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setOb(parseInt((evt.target as HTMLInputElement).value, 10));
          }}
        />
      </Label>
      <Label>
        Page number
        <InputGroup
          value={page ? page.toString() : ''}
          key="page"
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
