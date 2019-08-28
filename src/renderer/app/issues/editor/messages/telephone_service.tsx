import React, { useState } from 'react';
import { Label, Button, FormGroup, InputGroup } from '@blueprintjs/core';
import { DatePicker } from '@blueprintjs/datetime';

import {
  TSCommunication,
  TSCountryCommunicationSet,
  TelephoneServiceMessage,
} from 'main/issues/messages/telephone_service';

import { FreeformContents } from '../freeform-contents';
import { MessageEditorProps, MessageEditorDialog } from '../message-editor';

import * as styles from '../styles.scss';


interface CommunicationEditorProps {
  comm: TSCommunication,
  onSave: (updatedComm: TSCommunication) => void,
}
const CommunicationEditor: React.FC<CommunicationEditorProps> = function ({ comm, onSave }) {
  var doc = Object.assign({}, comm.contents);
  const [dirty, setDirty] = useState(false);

  return (
    <>

      <p>Communication of {comm.date.toString()}</p>

      <FreeformContents
        doc={doc}
        onChange={(updatedDoc) => {
          Object.keys(doc).forEach(function(key) {
            delete doc[key];
          });
          Object.assign(doc, JSON.parse(JSON.stringify(updatedDoc, null, 2)));
          if (!dirty) { setDirty(true); }
        }}
      />

      {dirty
        ? <Button
            onClick={() => {
              setDirty(false);
              comm.contents = doc;
              onSave(comm);
            }}
            text="Save"
            intent="primary"
          />
        : ''}

    </>
  );
};

interface NewCommPromptProps {
  onCreate: (commStub: TSCommunication) => void;
}
const NewCommPrompt: React.FC<NewCommPromptProps> = function ({ onCreate }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commDate, setCommDate] = useState(new Date());

  function onSave() {
    onCreate({ date: commDate, contents: {} });
    onClose();
  }
  function onClose() {
    setDialogOpen(false);
  }

  return (
    <>
      <Button 
        key="dialogButton"
        icon="plus"
        onClick={() => setDialogOpen(true)}
        className={styles.addCommTrigger}>Add another communication</Button>

      <MessageEditorDialog
          title="Add communication"
          isOpen={dialogOpen}
          onClose={onClose}
          saveButton={
            <Button intent="primary" onClick={onSave}>Add communication</Button>
          }>
        <FormGroup
            label="Communication date"
            intent="primary">
          <DatePicker
            key="datePicker"
            canClearSelection={false}
            value={commDate}
            onChange={(val: Date) => setCommDate(val)} />
        </FormGroup>
      </MessageEditorDialog>
    </>
  );
};

interface NewCountryPromptProps {
  onCreate: (countryCommSetStub: TSCountryCommunicationSet) => void;
}
const NewCountryPrompt: React.FC<NewCountryPromptProps> = function ({ onCreate }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [countryName, setCountryName] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [firstCommDate, setFirstCommDate] = useState(new Date());

  function onSave() {
    if (countryName != '' && phoneCode != '') {
      onCreate({
        country_name: countryName,
        phone_code: phoneCode,
        communications: [{
          date: firstCommDate,
          contents: {},
        }],
        contact: '',
      });
      onClose();
    }
  }
  function onClose() {
    setDialogOpen(false);
  }

  return (
    <>
      <Button 
        key="dialogButton"
        icon="plus"
        onClick={() => setDialogOpen(true)}
        className={styles.addCountryTrigger}>Add country</Button>

      <MessageEditorDialog
          title="Add country"
          isOpen={dialogOpen}
          onClose={onClose}
          saveButton={
            <Button intent="primary" onClick={onSave}>Add country</Button>
          }>

          <Label>
            Country name
            <InputGroup
              value={countryName}
              key="countryName"
              type="text"
              large={true}
              onChange={(evt: React.FormEvent<HTMLElement>) =>
                setCountryName((evt.target as HTMLInputElement).value as string)}
            />
          </Label>

          <Label>
            Phone code
            <InputGroup
              value={phoneCode}
              key="phoneCode"
              type="text"
              large={true}
              onChange={(evt: React.FormEvent<HTMLElement>) =>
                setPhoneCode((evt.target as HTMLInputElement).value as string)}
            />
          </Label>

          <FormGroup
              label="Communication date"
              intent="primary">
            <DatePicker
              key="datePicker"
              canClearSelection={false}
              value={firstCommDate}
              onChange={(val: Date) => setFirstCommDate(val)} />

          </FormGroup>
      </MessageEditorDialog>
    </>
  );
};

export const TelephoneServiceMessageEditor: React.FC<MessageEditorProps> = function ({ message, onChange }) {
  var countryCommSets = (message as TelephoneServiceMessage).contents;

  function makeAddCountryPrompt(idx: number) {
    return <NewCountryPrompt
      key={`addCountry-${idx}`}
      onCreate={(countryCommSet) => {
        countryCommSets.splice(idx, 0, countryCommSet);
        onChange(Object.assign({}, (message as TelephoneServiceMessage), { contents: countryCommSets }));
      }}
    />
  }

  function makeAddCommunicationPrompt(countryIdx: number, idx: number) {
    return <NewCommPrompt
      key={`addComm-${countryIdx}-${idx}`}
      onCreate={(comm) => {
        countryCommSets[countryIdx].communications.splice(idx, 0, comm);
        onChange(Object.assign({}, (message as TelephoneServiceMessage), { contents: countryCommSets }));
      }}
    />
  }

  function updateCommunication(countryIdx: number, commIdx: number, updatedComm: TSCommunication) {
    countryCommSets = countryCommSets.map((countryCommSet: TSCountryCommunicationSet, _idx: number) => {
      if (countryIdx === _idx) {
        countryCommSet.communications = countryCommSet.communications.map((comm: TSCommunication, _idx: number) => {
          if (_idx === commIdx) {
            return updatedComm;
          } else {
            return comm;
          }
        });
      }
      return countryCommSet;
    });
  }

  return (
    <>
      {makeAddCountryPrompt(0)}

      {countryCommSets.length > 0
        ? countryCommSets.map((countryCommSet: TSCountryCommunicationSet, countryIdx: number) => (
          <>
            {makeAddCommunicationPrompt(countryIdx, 0)}

            <article className={styles.tsCountryCommunicationSet} key={countryIdx}>
              <p>{countryCommSet.country_name} (country code +{countryCommSet.phone_code})</p>

              {countryCommSet.communications.length > 0
                ? countryCommSet.communications.map((comm: TSCommunication, commIdx: number) => (
                  <>
                    <article className={styles.tsCommunication} key={commIdx}>
                      <CommunicationEditor
                        comm={comm}
                        onSave={(updatedComm) => {
                          updateCommunication(countryIdx, commIdx, updatedComm);
                          onChange(Object.assign({}, (message as TelephoneServiceMessage), { contents: countryCommSets }));
                        }} />
                    </article>

                    {makeAddCommunicationPrompt(countryIdx, commIdx + 1)}
                  </>))
                : <p key="noCommsText">No communications to display for this country.</p>
              }
            </article>

            {makeAddCountryPrompt(countryIdx + 1)}
          </>
        ))
        : <p key="noCountryText">No country communications to display.</p>
      }
    </>
  );
};
