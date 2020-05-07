import update from 'immutability-helper';
import React, { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import Backend from 'react-dnd-html5-backend';
import {
  FormGroup, InputGroup, Checkbox, TextArea, ControlGroup,
  Button, ButtonGroup,
} from '@blueprintjs/core';
import { DatePicker } from '@blueprintjs/datetime';
import { PaneHeader } from 'coulomb/renderer/widgets';
import { Sortable } from 'renderer/widgets/dnd-sortable'
import { OBIssue, OBAuthorOrg, Contact, ScheduledIssue } from 'models/issues';
import { defaultISSN, availableLanguages, defaultLanguage } from '../../app';
import * as styles from './styles.scss';


type MetaID = { issn: string, id: number };
type MetaAuthors = Pick<OBIssue, 'authors'>;
type MetaLanguages = Pick<OBIssue, 'languages'>;
type MetaSchedule = ScheduledIssue;



interface MetaEditorProps<Data extends Partial<OBIssue>> {
  data: Data
  onChange: (data: Data) => void 
}


const MetaIDEditor: React.FC<MetaEditorProps<MetaID>> = function ({ data, onChange }) {
  const [_data, _setData] = useState<MetaID>(data);

  function updateData(newDataPartial: Partial<MetaID>) {
    const newData: MetaID = { ...data, ...newDataPartial };
    _setData(newData);
    onChange(newData);
  }

  return <div className={styles.metaIDPane}>
    <FormGroup label="ISSN" helperText="ISSN to be shown in this issue header.">
      <InputGroup required large
        type="text"
        value={_data.issn}
        placeholder={defaultISSN}
        onChange={(evt: React.FormEvent<HTMLInputElement>) =>
          updateData({ issn: evt.currentTarget.value })} />
    </FormGroup>
    <FormGroup
        label="Issue ID"
        helperText="ID of an issue cannot be changed after issue is created.">
      <InputGroup large type="number" disabled defaultValue={`${data.id}`} />
    </FormGroup>
  </div>;
};



const MetaAuthorsEditor: React.FC<MetaEditorProps<MetaAuthors>> = function ({ data, onChange }) {
  type AuthorOrPlaceholder = OBAuthorOrg & { isPlaceholder?: true };

  const [_data, _setData] = useState<MetaAuthors>(data);

  var authors: AuthorOrPlaceholder[] =  [ ...(_data.authors || []) ];;
  if (authors.find(a => a.isPlaceholder === true) === undefined) {
    authors.push({ isPlaceholder: true, contacts: [] });
  }

  function updateData(newAuthors: AuthorOrPlaceholder[]) {
    _setData({ ...data, authors: newAuthors });

    const authors: OBAuthorOrg[] = newAuthors.filter(a => a.isPlaceholder !== true);
    onChange({ ...data, authors });
  }

  function updateItem(idx: number, item: AuthorOrPlaceholder) {
    var _newItem: AuthorOrPlaceholder = { ...item };
    if (itemIsNotEmpty(_newItem)) {
      _newItem.isPlaceholder = undefined;
    }

    var items = [ ...authors ];
    items[idx] = _newItem;
    updateData(sanitizeAuthors(items));
  }

  function itemIsNotEmpty(a: AuthorOrPlaceholder) {
    return a && ((a.name || '').trim() !== '' || (a.address || '').trim() !== '');
  }

  function sanitizeAuthors(items: OBAuthorOrg[]) {
    return items.filter(itemIsNotEmpty);
  }

  function deleteItem(idx: number) {
    updateData(update(authors, { $splice: [[idx, 1]] }));
  }

  const moveItem = useCallback((dragIndex: number, hoverIndex: number) => {
    if (dragIndex === undefined) return;
    if (authors[dragIndex].isPlaceholder) return;

    const dragItem = authors[dragIndex];
    updateData(update(authors, { $splice: [[dragIndex, 1], [hoverIndex, 0, dragItem]] }));
  }, [authors]);

  function renderAuthor(author: AuthorOrPlaceholder, idx: number) {
    return (
      author !== undefined
        ? <Sortable
              key={author.isPlaceholder ? 'placeholder' : (_data.authors || []).indexOf(author)}
              idx={idx}
              canReorder={author.isPlaceholder !== true}
              itemType='author'
              onReorder={moveItem}
              handleIcon="menu"
              className={`${styles.sortable} ${styles.metaAuthorItem}`}
              draggingClassName={styles.sortableDragged}
              handleClassName={styles.sortableDragHandle}>
          <PaneHeader
              className={styles.metaAuthorItemTitle}
              actions={<Button
                disabled={author.isPlaceholder}
                onClick={() => deleteItem(idx)}
                icon="cross"
                title="Delete this author." />}
              align="left">
            {author.isPlaceholder ? <>New author</> : <>Author {idx + 1}</>}
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
        {[ ...authors.entries() ].map(([idx, author]) => renderAuthor(author, idx) )}
      </div>
    </DndProvider>
  </>;
};

const AuthorItem: React.FC<{ author: OBAuthorOrg, onChange: (author: OBAuthorOrg) => void }> = function ({ author, onChange }) {
  type ContactOrPlaceholder = Contact & { isPlaceholder?: true };

  //const [_data, _setData] = useState<OBAuthorOrg>(author);

  function updateData(newDataPartial: Partial<OBAuthorOrg>, save = true) {
    const newData = { ...author, ...newDataPartial };
    //_setData(newData);
    if (save) { onChange(newData); }
  }

  function itemIsNotEmpty(c: ContactOrPlaceholder) {
    return c && c.data.trim() !== '';
  }

  function updateItem(idx: number, c: Contact) {
    var _newItem: ContactOrPlaceholder = { ...c };
    if (itemIsNotEmpty(c)) {
      _newItem.isPlaceholder = undefined;
    }

    var items = [ ...author.contacts ];
    items[idx] = _newItem;
    updateData({ contacts: items }, true);
  }

  function deleteItem(idx: number) {
    updateData({ contacts: update(contacts, { $splice: [[idx, 1]] }) });
  }

  var contacts: ContactOrPlaceholder[] =  [ ...(author.contacts || []) ];
  if (contacts.find(c => c.isPlaceholder === true) === undefined) {
    contacts.push({ type: 'phone', data: '', isPlaceholder: true });
  }

  const moveItem = useCallback((dragIndex: number, hoverIndex: number) => {
    if (dragIndex === undefined) return;
    if (contacts[dragIndex].isPlaceholder) return;

    const dragItem = contacts[dragIndex];
    updateData({ contacts: update(contacts, { $splice: [[dragIndex, 1], [hoverIndex, 0, dragItem]] }) });
  }, [contacts]);

  return <>
    <FormGroup
        label="Name"
        helperText="Name of organization or department.">
      <InputGroup
        onBlur={() => updateData({}, true)}
        type="text"
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
      {[ ...contacts.entries() ].map(([idx, c]) =>
        <Sortable
            key={c.isPlaceholder ? 'placeholder' : (author.contacts || []).indexOf(c)}
            idx={idx}
            canReorder={c.isPlaceholder !== true}
            itemType={`contact`}
            onReorder={moveItem}
            handleIcon="menu"
            className={`${styles.sortable} ${styles.metaAuthorContactItem}`}
            draggingClassName={styles.sortableDragged}
            handleClassName={styles.sortableDragHandle}>
          <AuthorContactItem
            key={idx}
            contact={c}
            onDelete={c.isPlaceholder ? undefined : () => deleteItem(idx)}
            onChange={(newC) => updateItem(idx, newC)} />
        </Sortable>
      )}
    </div>
  </>;
};

const AuthorContactItem: React.FC<{ contact: Contact, onChange: (contact: Contact) => void, onDelete?: () => void }> = function ({ contact, onChange, onDelete }) {
  //const [_data, _setData] = useState<Contact>(contact);

  function updateData(newDataPartial: Partial<Contact>, save = true) {
    const newData = { ...contact, ...newDataPartial };
    //_setData(newData);
    if (save) { onChange(newData) };
  }

  return <ControlGroup fill>
    <ButtonGroup>
      <Button active={contact.type === 'phone'} onClick={() => updateData({ type: "phone" })}>Phone</Button>
      <Button active={contact.type === 'email'} onClick={() => updateData({ type: "email" })}>Email</Button>
      <Button active={contact.type === 'fax'} onClick={() => updateData({ type: "fax" })}>Fax</Button>
    </ButtonGroup>
    <InputGroup required
      fill
      type="text"
      placeholder="New contact data…"
      onBlur={() => updateData({}, true)}
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
        icon="cross" />
    </ButtonGroup>
  </ControlGroup>;
};


const MetaLanguagesEditor: React.FC<MetaEditorProps<MetaLanguages>> = function ({ data, onChange }) {
  function updateData(newDataPartial: Partial<MetaLanguages>) {
    const newData: MetaLanguages = { ...data, ...newDataPartial };
    onChange(newData);
  }

  const langs = data.languages || {};

  return <div className={styles.metaLanguagesPane}>
    <FormGroup
        label="Enabled languages"
        helperText="Selected languages will be included for translation.">

      {Object.keys(availableLanguages).map(langID => {
        const isDefault = langID === defaultLanguage;
        const isSelected = langs[langID as keyof typeof availableLanguages] === true;
        const label: string = availableLanguages[langID as keyof typeof availableLanguages];

        return <Checkbox
          key={langID}
          required={isDefault}
          labelElement={isDefault ? <> (required)</> : undefined}
          disabled={isDefault && isSelected}
          label={label}
          checked={isSelected}
          onChange={() =>
            updateData({ languages: { ...langs, [langID]: !isSelected }})} />
      })}
    </FormGroup>
  </div>;
};


const MetaScheduleEditor: React.FC<MetaEditorProps<MetaSchedule>> = function ({ data, onChange }) {
  return (
    <div className={styles.metaSchedulePane}>
      <FormGroup label="Publication date">
        <DatePicker
          className={styles.metaScheduleCalendar}
          value={data.publication_date}
          canClearSelection={false}
          showActionsBar={true}
          onChange={newDate => {
            onChange({ ...data, publication_date: newDate });
          }}
        />
      </FormGroup>
      <FormGroup label="Cutoff date">
        <DatePicker
          className={styles.metaScheduleCalendar}
          value={data.cutoff_date}
          canClearSelection={false}
          showActionsBar={true}
          onChange={newDate => {
            onChange({ ...data, cutoff_date: newDate });
          }}
        />
      </FormGroup>
    </div>
  );
};


export const metaEditors: { [key: string]: React.FC<MetaEditorProps<any>> } = {
  metaID: MetaIDEditor,
  metaAuthors: MetaAuthorsEditor,
  metaLanguages: MetaLanguagesEditor,
  metaSchedule: MetaScheduleEditor,
};