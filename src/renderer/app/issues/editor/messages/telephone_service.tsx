import React, { useState } from 'react';
import { H4, H5, Card, Label, Button, FormGroup, InputGroup, TextArea } from '@blueprintjs/core';
import { DatePicker } from '@blueprintjs/datetime';

import {
  TSCommunication,
  TSCountryCommunicationSet,
  TelephoneServiceMessage,
} from 'main/issues/messages/telephone_service';

import { DateStamp } from 'renderer/app/dates';

import { FreeformContents } from '../freeform-contents';
import { MessageEditorProps, MessageEditorDialog } from '../message-editor';

import * as styles from '../styles.scss';


export const TelephoneServiceMessageEditor: React.FC<MessageEditorProps> = function ({ message, onChange }) {
  var countryCommSets = (message as TelephoneServiceMessage).contents;

  function _onChange() {
    onChange(Object.assign(
      {},
      (message as TelephoneServiceMessage),
      { contents: countryCommSets }));
  }

  function getNewCommStub() {
    return {
      date: new Date(),
      contents: {},
    };
  }
  function getNewCountryStub() {
    return {
      country_name: '',
      phone_code: '',
      contact: '',
      communications: [],
    };
  }

  function makeAddCountryPrompt(idx: number) {
    const hasCountries = Object.keys(countryCommSets).length > 0;

    return (
      <Button 
        key={`addCountry-${idx}`}
        icon="plus"
        intent={hasCountries ? undefined : "primary"}
        small={hasCountries ? true : false}
        onClick={() => {
          setActiveCountryIdx(idx);
          toggleNewCountryDialogState(true);
        }}
        className={styles.addCountryTrigger}
      >{hasCountries ? "Add country" : "Add another country"}</Button>
    );
  }

  function makeEditCountryPrompt(idx: number) {
    return (
      <Button 
        key={`editCountry-${idx}`}
        icon="edit"
        small={true}
        minimal={true}
        onClick={() => {
          setActiveCountryIdx(idx);
          console.debug(countryCommSets[activeCountryIdx]);
          toggleEditCountryDialogState(true);
        }}
      >Edit country details</Button>
    );
  }

  function makeAddCommunicationPrompt(countryIdx: number, idx: number) {
    const hasCommunications = countryCommSets[countryIdx].communications.length > 0;

    return (
      <Button 
        key={`addCommunication-${countryIdx}-${idx}`}
        icon="plus"
        intent={hasCommunications ? undefined : "success"}
        small={hasCommunications ? true : false}
        onClick={() => {
          setActiveCountryIdx(countryIdx);
          setActiveCommIdx(idx);
          toggleNewCommDialogState(true);
        }}
        className={hasCommunications ? styles.addCommTrigger : ''}
      >{hasCommunications ? "Add another communication" : "Add communication"}</Button>
    );
  }

  function makeEditCommunicationPrompt(countryIdx: number, idx: number) {
    return (
      <Button 
        key={`editCommunication-${countryIdx}-${idx}`}
        icon="edit"
        small={true}
        minimal={true}
        onClick={() => {
          setActiveCountryIdx(countryIdx);
          setActiveCommIdx(idx);
          toggleEditCommDialogState(true);
        }}
      >Edit</Button>
    );
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

  const [activeCountryIdx, setActiveCountryIdx] = useState(0);
  const [activeCommIdx, setActiveCommIdx] = useState(0);
  const [newCountryDialogState, toggleNewCountryDialogState] = useState(false);
  const [editCountryDialogState, toggleEditCountryDialogState] = useState(false);
  const [newCommDialogState, toggleNewCommDialogState] = useState(false);
  const [editCommDialogState, toggleEditCommDialogState] = useState(false);

  return (
    <>
      {makeAddCountryPrompt(0)}

      {countryCommSets.length > 0
        ? countryCommSets.map((countryCommSet: TSCountryCommunicationSet, countryIdx: number) => (
          <>
            <Card className={styles.tsCountryCommunicationSet} key={countryIdx}>
              <H4>
                {countryCommSet.country_name} (country code +{countryCommSet.phone_code})
                {makeEditCountryPrompt(countryIdx)}
              </H4>

              <div className={styles.tsCommunicationList}>
                {makeAddCommunicationPrompt(countryIdx, 0)}

                {countryCommSet.communications.length > 0
                  ? countryCommSet.communications.map((comm: TSCommunication, commIdx: number) => (
                    <>
                      <Card className={styles.tsCommunication} key={commIdx}>
                        <H5>
                          Communication of <DateStamp date={comm.date} />
                          {makeEditCommunicationPrompt(countryIdx, commIdx)}
                        </H5>
                      </Card>

                      {makeAddCommunicationPrompt(countryIdx, commIdx + 1)}
                    </>))
                  : ''}
              </div>
            </Card>

            {makeAddCountryPrompt(countryIdx + 1)}
          </>
        ))
        : ''}

      {newCountryDialogState === true 
        ? <EditCountryDialog
            key="addCountry"
            title="Add country"
            countryCommSet={getNewCountryStub()}
            isOpen={true}
            onClose={() => toggleNewCountryDialogState(false)}
            onSave={(countryCommSet: TSCountryCommunicationSet) => {
              countryCommSets.splice(activeCountryIdx, 0, countryCommSet);
              _onChange();
              toggleNewCountryDialogState(false);
            }}
          />
        : ''}

      {editCountryDialogState === true && countryCommSets[activeCountryIdx] !== undefined
        ? <EditCountryDialog
            key="editCountry"
            title="Edit country"
            countryCommSet={countryCommSets[activeCountryIdx]}
            isOpen={true}
            onClose={() => toggleEditCountryDialogState(false)}
            onSave={(countryCommSet) => {
              countryCommSets[activeCountryIdx].phone_code = countryCommSet.phone_code;
              countryCommSets[activeCountryIdx].country_name = countryCommSet.country_name;
              countryCommSets[activeCountryIdx].contact = countryCommSet.contact;
              _onChange();
              toggleEditCountryDialogState(false);
            }}
          />
        : ''}

      {newCommDialogState === true
        ? <EditCommunicationDialog
            key="addCommunication"
            title="Add communication"
            comm={getNewCommStub()}
            isOpen={true}
            onClose={() => toggleNewCommDialogState(false)}
            onSave={(comm) => {
              countryCommSets[activeCountryIdx].communications.splice(activeCommIdx, 0, comm);
              _onChange();
              toggleNewCommDialogState(false);
            }}
          />
        : ''}

      {editCommDialogState === true && ((countryCommSets[activeCountryIdx] || {}).communications || [])[activeCommIdx] !== undefined
        ? <EditCommunicationDialog
            key="editCommunication"
            title={`Edit communication ${activeCommIdx + 1}`}
            comm={countryCommSets[activeCountryIdx].communications[activeCommIdx]}
            isOpen={true}
            onClose={() => toggleEditCommDialogState(false)}
            onSave={(comm) => {
              updateCommunication(activeCountryIdx, activeCommIdx, comm);
              _onChange();
              toggleEditCommDialogState(false);
            }}
          />
        : ''}

    </>
  );
};


/* Dialogs */


interface EditCountryDialogProps {
  isOpen: boolean,
  countryCommSet: TSCountryCommunicationSet,
  title: string,
  onSave: (countryCommSet: TSCountryCommunicationSet) => void,
  onClose: () => void,
}
const EditCountryDialog: React.FC<EditCountryDialogProps> = function ({ isOpen, countryCommSet, title, onSave, onClose }) {
  const [countryName, setCountryName] = useState(countryCommSet.country_name);
  const [phoneCode, setPhoneCode] = useState(countryCommSet.phone_code);
  const [contactInfo, setContactInfo] = useState(countryCommSet.contact);

  function _onSave() {
    if (countryName != '' && phoneCode != '' && contactInfo != '') {
      onSave({
        country_name: countryName,
        phone_code: phoneCode,
        contact: contactInfo,
        communications: countryCommSet.communications,
      });
      onClose();
    }
  }

  // A country with a single communication is a common case.
  // TODO: We should allow authors to add first communication
  // while they’re adding the country, instead of requiring to use
  // another dialog.
  return (
    <>
      <MessageEditorDialog
          title={title}
          isOpen={isOpen}
          onClose={onClose}
          saveButton={
            <Button intent="primary" onClick={_onSave}>Save country</Button>
          }>
        <TSCountryDetailsEditor
          countryName={countryName}
          phoneCode={phoneCode}
          contactInfo={contactInfo}
          onChange={(countryName: string, phoneCode: string, contactInfo: string) => {
            setCountryName(countryName);
            setPhoneCode(phoneCode);
            setContactInfo(contactInfo);
          }}
        />
      </MessageEditorDialog>
    </>
  );
};


interface EditCommunicationDialogProps {
  isOpen: boolean,
  comm: TSCommunication,
  title: string,
  onSave: (comm: TSCommunication) => void,
  onClose: () => void,
}
const EditCommunicationDialog: React.FC<EditCommunicationDialogProps> = function ({ isOpen, comm, title, onSave, onClose }) {
  const [commDate, setCommDate] = useState(comm.date);
  const [commContents, setCommContents] = useState(comm.contents);

  function _onSave() {
    onSave({ date: commDate, contents: commContents });
    onClose();
  }

  return (
    <MessageEditorDialog
        title={title}
        isOpen={isOpen}
        onClose={onClose}
        saveButton={
          <Button intent="primary" onClick={_onSave}>Save communication</Button>
        }>
      <TSCountryCommunicationDetailsEditor
        date={commDate}
        contents={commContents}
        onChange={(date: Date, contents: any) => {
          setCommDate(date);
          setCommContents(contents);
        }}
      />
    </MessageEditorDialog>
  );
};


/* Editors */


interface TSCountryCommunicationDetailsEditorProps {
  date: Date,
  contents: any,
  onChange: (newDate: Date, newContents: any) => void,
}
const TSCountryCommunicationDetailsEditor: React.FC<TSCountryCommunicationDetailsEditorProps> =
    function ({ date, contents, onChange }) {

  const [newDate, setDate] = useState(date);
  var newContents = Object.assign({}, contents);

  function _onChange() {
    onChange(newDate, newContents);
  }

  return (
    <div className={styles.tsCountryCommunicationEditor}>
      <FormGroup
          label="Communication date"
          intent="primary">
        <DatePicker
          key="datePicker"
          canClearSelection={false}
          value={newDate}
          onChange={(val: Date) => {
            setDate(val);
            _onChange();
          }}
        />
      </FormGroup>

      <FormGroup
          label="Communication contents"
          intent="primary">
        <Card>
          <FreeformContents
            doc={newContents}
            onChange={(updatedDoc) => {
              Object.keys(newContents).forEach(function(key) { delete newContents[key]; });
              Object.assign(newContents, JSON.parse(JSON.stringify(updatedDoc, null, 2)));
              _onChange();
            }}
          />
        </Card>
      </FormGroup>
    </div>
  );
};


interface TSCountryDetailsEditorProps {
  countryName: string,
  phoneCode: string,
  contactInfo: string,
  onChange: (newCountryName: string, newPhoneCode: string, newContactInfo: string) => void,
}
const TSCountryDetailsEditor: React.FC<TSCountryDetailsEditorProps> =
    function ({ countryName, phoneCode, contactInfo, onChange }) {

  const [newCountryName, setCountryName] = useState(countryName);
  const [newPhoneCode, setPhoneCode] = useState(phoneCode);
  const [newContactInfo, setContactInfo] = useState(contactInfo);

  function _onChange() {
    onChange(newCountryName, newPhoneCode, newContactInfo);
  }

  return (
    <>

      <Label>
        Country name
        <InputGroup
          value={newCountryName}
          key="countryName"
          type="text"
          large={true}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setCountryName((evt.target as HTMLInputElement).value as string);
            _onChange();
          }}
        />
      </Label>

      <Label>
        Phone code
        <InputGroup
          value={newPhoneCode}
          key="phoneCode"
          type="text"
          large={true}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setPhoneCode((evt.target as HTMLInputElement).value as string);
            _onChange();
          }}
        />
      </Label>

      <Label>
        Contact info
        <TextArea
          value={newContactInfo}
          key="contactInfo"
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setContactInfo((evt.target as HTMLInputElement).value as string);
            _onChange();
          }}
        />
      </Label>

    </>
  );
};
