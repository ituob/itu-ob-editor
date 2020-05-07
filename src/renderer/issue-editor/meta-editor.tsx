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
      <Button className={styles.metaNewItem} onClick={appendNew} icon="add">Add author</Button>
    </DndProvider>
  </>;
};

const AuthorItem: React.FC<{ author: OBAuthorOrg, onChange: (author: OBAuthorOrg) => void }> = function ({ author, onChange }) {
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
      <Button className={styles.metaNewItem} onClick={appendNew} icon="add">Add contact</Button>
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

  const contactTypes: ('phone' | 'email' | 'fax')[] = [
    'phone',
    'email',
    'fax',
  ];

  return <ControlGroup fill>
    <ButtonGroup>
      {contactTypes.map(ct =>
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
      type="text"
      placeholder="New contact data…"
      value={contact.data || ''}
      onChange={(evt: React.FormEvent<HTMLInputElement>) =>
        updateData({ data: evt.currentTarget.value })} />
    <ButtonGroup>
      <Button
        minimal
        active={contact.recommended === true}
        onClick={() =>
          updateData({ recommended: !contact.recommended }, true)}>Highlight</Button>
      <Button
        minimal
        disabled={!onDelete}
        title="Delete this contact."
        onClick={onDelete}
        icon="delete" />
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