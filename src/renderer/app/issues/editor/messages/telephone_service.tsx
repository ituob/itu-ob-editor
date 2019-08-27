import React, { useState } from 'react';
import { Dialog, Button, InputGroup } from '@blueprintjs/core';
import { DatePicker } from '@blueprintjs/datetime';
import * as styles from '../styles.scss';

import {
  TSCommunication,
  TSCountryCommunicationSet,
  TelephoneServiceMessage,
} from 'main/issues/messages/telephone_service';

import { FreeformContents } from '../freeform-contents';
import { MessageEditorProps } from '../message-editor';


interface CommunicationEditorProps {
  comm: TSCommunication,
  onSave: (updatedComm: TSCommunication) => void,
}
const CommunicationEditor: React.FC<CommunicationEditorProps> = function ({ comm, onSave }) {
  var doc = Object.assign({}, comm.contents);

  return (
    <React.Fragment>
      <p>Communication of {comm.date.toString()}</p>

      <FreeformContents
        doc={doc}
        onChange={(updatedDoc) => {
          Object.keys(doc).forEach(function(key) {
            delete doc[key];
          });
          Object.assign(doc, JSON.parse(JSON.stringify(updatedDoc, null, 2)));
          comm.contents = doc;
          onSave(comm);
        }}
      />
    </React.Fragment>
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
    <React.Fragment>
      <Button 
        key="dialogButton"
        icon="plus"
        onClick={() => setDialogOpen(true)}
        className={styles.addCommTrigger}>Add communication</Button>

      <Dialog key="dialog" isOpen={dialogOpen} onClose={onClose}>
        <DatePicker
          key="datePicker"
          canClearSelection={false}
          value={commDate}
          onChange={(val: Date) => setCommDate(val)} />
        <Button key="saveButton" onClick={onSave}>Save</Button>
      </Dialog>
    </React.Fragment>
  );
};

interface NewCountryPromptProps {
  onCreate: (countryCommSetStub: TSCountryCommunicationSet) => void;
}
const NewCountryPrompt: React.FC<NewCountryPromptProps> = function ({ onCreate }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [countryName, setCountryName] = useState('');
  const [phoneCode, setPhoneCode] = useState('');

  function onSave() {
    if (countryName != '' && phoneCode != '') {
      onCreate({
        country_name: countryName,
        phone_code: phoneCode,
        communications: [],
        contact: '',
      });
      onClose();
    }
  }
  function onClose() {
    setDialogOpen(false);
  }

  return (
    <React.Fragment>
      <Button 
        key="dialogButton"
        icon="plus"
        onClick={() => setDialogOpen(true)}
        className={styles.addCountryTrigger}>Add country</Button>

      <Dialog key="dialog" isOpen={dialogOpen} onClose={onClose}>
        <InputGroup
          value={countryName}
          key="countryName"
          onChange={(evt: React.FormEvent<HTMLElement>) =>
            setCountryName((evt.target as HTMLInputElement).value as string)}
        />

        <InputGroup
          value={phoneCode}
          key="phoneCode"
          onChange={(evt: React.FormEvent<HTMLElement>) =>
            setPhoneCode((evt.target as HTMLInputElement).value as string)}
        />

        <Button key="saveButton" onClick={onSave}>Save</Button>
      </Dialog>
    </React.Fragment>
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
    <React.Fragment>
      {makeAddCountryPrompt(0)}

      {countryCommSets.length > 0
        ? countryCommSets.map((countryCommSet: TSCountryCommunicationSet, countryIdx: number) => (
          <React.Fragment>
            {makeAddCommunicationPrompt(countryIdx, 0)}

            <article className={styles.tsCountryCommunicationSet} key={countryIdx}>
              <p>{countryCommSet.country_name} (country code +{countryCommSet.phone_code})</p>

              {countryCommSet.communications.length > 0
                ? countryCommSet.communications.map((comm: TSCommunication, commIdx: number) => (
                  <React.Fragment>
                    <article className={styles.tsCommunication} key={commIdx}>
                      <CommunicationEditor
                        comm={comm}
                        onSave={(updatedComm) => {
                          updateCommunication(countryIdx, commIdx, updatedComm);
                          onChange(Object.assign({}, (message as TelephoneServiceMessage), { contents: countryCommSets }));
                        }} />
                    </article>

                    {makeAddCommunicationPrompt(countryIdx, commIdx + 1)}
                  </React.Fragment>))
                : <p key="noCommsText">No communications to display for this country.</p>
              }
            </article>

            {makeAddCountryPrompt(countryIdx + 1)}
          </React.Fragment>
        ))
        : <p key="noCountryText">No country communications to display.</p>
      }
    </React.Fragment>
  );
};
