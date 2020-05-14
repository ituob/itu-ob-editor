import update from 'immutability-helper';
import React, { useCallback, useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import Backend from 'react-dnd-html5-backend';
import {
  Button, FormGroup, InputGroup, TextArea,
  ControlGroup, ButtonGroup,
} from '@blueprintjs/core';
import { PaneHeader } from 'coulomb/renderer/widgets';
import { Sortable } from 'renderer/widgets/dnd-sortable'
import { OBIssue, OBAuthorOrg, Contact } from 'models/issues';

import { MetaEditorProps } from '.';
import * as styles from './styles.scss';


type MetaAuthors = Pick<OBIssue, 'authors'>;


const CONTACT_TYPES: ('phone' | 'email' | 'fax')[] = [
  'phone',
  'email',
  'fax',
];


const MetaAuthorsEditor: React.FC<MetaEditorProps<MetaAuthors>> = function ({ data, onChange }) {
  function updateData(newAuthors: OBAuthorOrg[]) {
    onChange({ ...data, authors: newAuthors });
  }

  function updateItem(idx: number, item: OBAuthorOrg) {
    var items = [ ...data.authors ];
    items[idx] = item;
    updateData(items);
  }

  function deleteItem(idx: number) {
    updateData(update(data.authors, { $splice: [[idx, 1]] }));
  }

  function appendNew() {
    updateData([ ...(data.authors || []), { name: '', contacts: [] }]);
  }

  const moveItem = useCallback((dragIndex: number, hoverIndex: number) => {
    if (dragIndex === undefined) return;

    const dragItem = data.authors[dragIndex];
    updateData(update(data.authors, { $splice: [[dragIndex, 1], [hoverIndex, 0, dragItem]] }));
  }, [data.authors]);

  function renderAuthor(author: OBAuthorOrg, idx: number) {
    return (
      author !== undefined
        ? <Sortable
              key={(data.authors || []).indexOf(author)}
              idx={idx}
              itemType='author'
              onReorder={moveItem}
              handleIcon="menu"
              className={`${styles.sortable} ${styles.metaAuthorItem}`}
              draggingClassName={styles.sortableDragged}
              handleClassName={styles.sortableDragHandle}>
          <PaneHeader
              className={styles.metaAuthorItemTitle}
              actions={<Button
                onClick={() => deleteItem(idx)}
                icon="delete"
                title="Delete this author.">Delete</Button>}
              align="left">
            Author {idx + 1}
          </PaneHeader>
          <AuthorItem
            author={author}
            onChange={(data) => updateItem(idx, data)} />
        </Sortable>
      : null
    );
  }

  return <>
    <DndProvider backend={Backend}>
      <div>
        {[ ...(data.authors || []).entries() ].map(([idx, author]) => renderAuthor(author, idx) )}
      </div>
      <Button
          className={styles.metaNewAuthor}
          onClick={appendNew}
          icon="add">
        Add author
      </Button>
    </DndProvider>
  </>;
};

const AuthorItem: React.FC<{ author: OBAuthorOrg, onChange: (author: OBAuthorOrg) => void }> = function ({ author, onChange }) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  function updateData(newDataPartial: Partial<OBAuthorOrg>, save = true) {
    const newData = { ...author, ...newDataPartial };
    if (save) { onChange(newData); }
  }

  function updateItem(idx: number, c: Contact) {
    var items = [ ...author.contacts ];
    items[idx] = c;
    updateData({ contacts: items }, true);
  }

  function deleteItem(idx: number) {
    updateData({ contacts: update(author.contacts, { $splice: [[idx, 1]] }) });
  }

  function appendNew() {
    updateData({ contacts: [ ...author.contacts, { data: '', type: 'phone' }] });
  }

  useEffect(() => {
    if ((author.name || '') === '' && (author.address || '') === '') {
      nameInputRef.current?.focus();
    }
  }, []);

  const moveItem = useCallback((dragIndex: number, hoverIndex: number) => {
    if (dragIndex === undefined) return;

    const dragItem = author.contacts[dragIndex];
    updateData({ contacts: update(author.contacts, { $splice: [[dragIndex, 1], [hoverIndex, 0, dragItem]] }) });
  }, [author.contacts]);

  return <>
    <FormGroup
        label="Name"
        helperText="Name of organization or department.">
      <InputGroup
        onBlur={() => updateData({}, true)}
        type="text"
        inputRef={(r) => nameInputRef.current = r}
        value={author.name || ''}
        placeholder={author.name}
        onChange={(evt: React.FormEvent<HTMLInputElement>) =>
          updateData({ name: evt.currentTarget.value.trim() !== '' ? evt.currentTarget.value : undefined })} />
    </FormGroup>

    <FormGroup label="Address">
      <TextArea growVertically
        className={styles.metaAuthorAddressTextarea}
        value={author.address || ''}
        placeholder={author.address}
        onChange={(evt: React.FormEvent<HTMLTextAreaElement>) =>
          updateData({ address: evt.currentTarget.value.trim() !== '' ? evt.currentTarget.value : undefined })} />
    </FormGroup>

    <div className={styles.metaAuthorContacts}>
      {[ ...author.contacts.entries() ].map(([idx, c]) =>
        <Sortable
            key={(author.contacts || []).indexOf(c)}
            idx={idx}
            itemType={`contact`}
            onReorder={moveItem}
            handleIcon="menu"
            className={`${styles.sortable} ${styles.metaAuthorContactItem}`}
            draggingClassName={styles.sortableDragged}
            handleClassName={styles.sortableDragHandle}>
          <AuthorContactItem
            key={idx}
            contact={c}
            onDelete={() => deleteItem(idx)}
            onChange={(newC) => updateItem(idx, newC)} />
        </Sortable>
      )}
      <div className={styles.metaNewItem}>
        <Button onClick={appendNew} icon="add">Add contact</Button>
      </div>
    </div>
  </>;
};

interface AuthorContactItemProps {
  contact: Contact
  onChange: (contact: Contact) => void
  onDelete?: () => void 
}
const AuthorContactItem: React.FC<AuthorContactItemProps> =
function ({ contact, onChange, onDelete }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function updateData(newDataPartial: Partial<Contact>, save = true) {
    const newData = { ...contact, ...newDataPartial };
    //_setData(newData);
    if (save) { onChange(newData) };
  }

  useEffect(() => {
    if ((contact.data || '') === '') {
      inputRef.current?.focus();
    }
  }, []);


  return <ControlGroup fill>
    <ButtonGroup>
      {CONTACT_TYPES.map(ct =>
        <Button
            key={ct}
            active={contact.type === ct}
            onClick={() => updateData({ type: ct }, true)}>
          {ct}
        </Button>
      )}
    </ButtonGroup>
    <InputGroup required
      fill
      inputRef={(r) => inputRef.current = r}
      type="text"
      placeholder="New contact data…"
      value={contact.data || ''}
      onChange={(evt: React.FormEvent<HTMLInputElement>) =>
        updateData({ data: evt.currentTarget.value })} />
    <ButtonGroup>
      <Button
        active={contact.recommended === true}
        onClick={() =>
          updateData({ recommended: !contact.recommended }, true)}>Highlight</Button>
      <Button
        disabled={!onDelete}
        title="Delete this contact."
        onClick={onDelete}
        icon="delete" />
    </ButtonGroup>
  </ControlGroup>;
};


export default MetaAuthorsEditor;