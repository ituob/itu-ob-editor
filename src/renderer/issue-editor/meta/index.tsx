import { remote } from 'electron';
import React, { useState, useContext } from 'react';
import {
  FormGroup, InputGroup, Checkbox, Button, HTMLSelect,
} from '@blueprintjs/core';
import { DatePicker } from '@blueprintjs/datetime';
import { callIPC } from '@riboseinc/coulomb/ipc/renderer';
import { LangConfigContext } from '@riboseinc/coulomb/localizer/renderer/context';

import { OBIssue, ScheduledIssue } from 'models/issues';
import { defaultISSN, availableLanguages, defaultLanguage } from '../../../app';

import { default as MetaAuthorsEditor } from './authors';
import * as styles from './styles.scss';


type MetaID = { issn: string, id: number };
type MetaLanguages = Pick<OBIssue, 'languages'>;
type MetaSchedule = ScheduledIssue;


export interface MetaEditorProps<Data extends Partial<OBIssue>> {
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


const MetaLanguagesEditor: React.FC<MetaEditorProps<MetaLanguages>> = function ({ data, onChange }) {
  const lang = useContext(LangConfigContext);
  function updateData(newDataPartial: Partial<MetaLanguages>) {
    const newData: MetaLanguages = { ...data, ...newDataPartial };
    onChange(newData);
  }

  const langs = data.languages || { en: true };

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

    <FormGroup
        label="Current language"
        helperText="View and edit this OB issue in this language.">
      <HTMLSelect
        onChange={(evt: React.FormEvent<HTMLSelectElement>) => {
          lang.select(evt.currentTarget.value);
        }}
        value={lang.selected}
        options={Object.keys(langs).map(langID =>
          ({ label: lang.available[langID], value: langID }))} />
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


const MetaDeleteIssue: React.FC<MetaEditorProps<MetaSchedule>> = function ({ data, onChange }) {
  async function deleteIssue() {
    await callIPC('model-issues-delete-one', { objectID: data.id });
    await remote.getCurrentWindow().close();
  }

  return (
    <div className={styles.metaDeleteIssuePane}>
      <FormGroup
          helperText={<>
            Only delete an issue if it was erroneously added,
            contact app developers in other cases.
            <br />
            Window will be closed after this issue is deleted.
          </>}>
        <Button onClick={deleteIssue} intent="danger">
          Delete this issue (think twice!)
        </Button>
      </FormGroup>
    </div>
  );
};


export const metaEditors: { [key: string]: React.FC<MetaEditorProps<any>> } = {
  metaID: MetaIDEditor,
  metaAuthors: MetaAuthorsEditor,
  metaLanguages: MetaLanguagesEditor,
  metaSchedule: MetaScheduleEditor,
  metaDeleteIssue: MetaDeleteIssue,
};
