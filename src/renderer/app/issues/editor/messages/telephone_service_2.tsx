import React, { useState, useEffect } from 'react';
import { H4, Label, Button, FormGroup, InputGroup, TextArea } from '@blueprintjs/core';
import { AddCardTrigger, SimpleEditableCard } from 'renderer/app/widgets/editable-card-list';
import { DatePicker } from '@blueprintjs/datetime';

import {
  TSCommunication,
  TSCountryCommunicationSet,
  TelephoneServiceMessageV2,
} from 'main/issues/messages/telephone_service_2';

import { DateStamp } from 'renderer/app/dates';

import { FreeformContents } from '../freeform-contents';
import { MessageEditorProps, MessageEditorDialog } from '../message-editor';

import * as widgetStyles from 'renderer/app/widgets/styles.scss';
import * as styles from '../styles.scss';


function getNewCommStub(): TSCommunication {
  return {
    date: new Date(),
    contents: {},
  };
}


function getNewCountryStub(): TSCountryCommunicationSet {
  return {
    country_name: '',
    phone_code: '',
    contact: '',
    communications: [],
  };
}


export const TelephoneServiceMessageEditorV2: React.FC<MessageEditorProps> = function ({ message, onChange }) {
  var countryCommSets = (message as TelephoneServiceMessageV2).contents;

  const [activeCountryIdx, setActiveCountryIdx] = useState(0);
  const [activeCommIdx, setActiveCommIdx] = useState(0);
  const [newCountryDialogState, toggleNewCountryDialogState] = useState(false);
  const [editCountryDialogState, toggleEditCountryDialogState] = useState(false);
  const [newCommDialogState, toggleNewCommDialogState] = useState(false);
  const [editCommDialogState, toggleEditCommDialogState] = useState(false);

  function _onChange() {
    onChange(Object.assign({}, (message as TelephoneServiceMessageV2), { contents: countryCommSets }));
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
      <h2 key="paneHeader" className={widgetStyles.paneHeader}>Telephone Service</h2>

      <AddCardTrigger
        key="addFirstCountry"
        onClick={() => {
          setActiveCountryIdx(0);
          toggleNewCountryDialogState(true);
        }}
      />

      {countryCommSets.length > 0
        ? countryCommSets.map((countryCommSet: TSCountryCommunicationSet, countryIdx: number) => (
          <>
            <SimpleEditableCard extended={true} key={countryIdx} onDelete={() => {
              countryCommSets.splice(countryIdx, 1);
              _onChange();
            }}>
              <H4>
                {countryCommSet.country_name}
                &emsp;
                +{countryCommSet.phone_code}
              </H4>

              <div className={styles.tsCountryButtons}>
                <span>
                  <EditCountryPrompt
                    key="editCountry"
                    title={<>Country details & contact info</>}
                    onOpen={() => {
                      setActiveCountryIdx(countryIdx);
                      toggleEditCountryDialogState(true);
                    }}
                  />
                </span>

                <AddCommunicationPrompt
                  key="addFirstComm"
                  title={<>Comm.</>}
                  onOpen={() => {
                    setActiveCountryIdx(countryIdx);
                    setActiveCommIdx(0);
                    toggleNewCommDialogState(true);
                  }}
                />
              </div>

              <div className={styles.tsCommunicationList}>
                {countryCommSet.communications.length > 0
                  ? countryCommSet.communications.map((comm: TSCommunication, commIdx: number) => (
                    <>
                      <article className={styles.tsCommunication} key={commIdx}>
                        <EditCommunicationPrompt
                          key="editComm"
                          title={<>Communication of <DateStamp date={comm.date} /></>}
                          onOpen={() => {
                            setActiveCountryIdx(countryIdx);
                            setActiveCommIdx(commIdx);
                            toggleEditCommDialogState(true);
                          }}
                        />

                        <Button
                          icon="delete"
                          small={true}
                          minimal={true}
                          intent="danger"
                          title="Delete communication"
                          onClick={() => {
                            countryCommSet.communications.splice(commIdx, 1);
                            _onChange();
                          }}>Delete</Button>

                        <AddCommunicationPrompt
                          key="addCommAfter"
                          title={<>Comm.</>}
                          onOpen={() => {
                            setActiveCountryIdx(countryIdx);
                            setActiveCommIdx(commIdx + 1);
                            toggleNewCommDialogState(true);
                          }}
                        />
                      </article>
                    </>))
                  : ''}
              </div>
            </SimpleEditableCard>

            <AddCardTrigger
              key="addAnother"
              onClick={() => {
                setActiveCountryIdx(countryIdx + 1);
                toggleNewCountryDialogState(true);
              }}
            />
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


/* Prompts */


interface EditCountryPromptProps {
  onOpen: () => void,
  title?: JSX.Element,
}
const EditCountryPrompt: React.FC<EditCountryPromptProps> = function ({ onOpen, title }) {
  return (
    <Button icon="edit" minimal={true} onClick={onOpen} title="Edit country details">
      {title}
    </Button>
  );
};


interface AddCommunicationPromptProps {
  onOpen: () => void,
  title?: JSX.Element,
}
const AddCommunicationPrompt: React.FC<AddCommunicationPromptProps> = function ({ onOpen, title }) {
  return (
    <Button
      icon="plus"
      minimal={true}
      onClick={onOpen}
      title="Add communication"
      intent="primary">
      {title}
    </Button>
  );
};


interface EditCommunicationPromptProps {
  onOpen: () => void,
  title?: JSX.Element,
}
const EditCommunicationPrompt: React.FC<EditCommunicationPromptProps> = function ({ onOpen, title }) {
  return (
    <Button icon="edit" minimal={true} onClick={onOpen} title="Edit communication">
      {title}
    </Button>
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
  const [newCountry, setCountry] = useState(Object.assign({}, countryCommSet));

  function _onSave() {
    if (newCountry.country_name != '' && newCountry.phone_code != '' && newCountry.contact != '') {
      onSave(newCountry);
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
          country={newCountry}
          onChange={(newCountry: TSCountryCommunicationSet) => {
            setCountry(newCountry);
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
        width="95vw"
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


interface TSCountryDetailsEditorProps {
  country: TSCountryCommunicationSet,
  onChange: (updated: TSCountryCommunicationSet) => void,
}
const TSCountryDetailsEditor: React.FC<TSCountryDetailsEditorProps> = function ({ country, onChange }) {
  const [newCountry, setCountry] = useState(country);

  useEffect(() => {
    onChange(newCountry);
  }, [newCountry]);

  return (
    <>
      <Label>
        Country name
        <InputGroup
          value={newCountry.country_name}
          key="countryName"
          type="text"
          large={true}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setCountry({
              ...newCountry,
              country_name: (evt.target as HTMLInputElement).value as string,
            });
          }}
        />
      </Label>

      <Label>
        Phone code
        <InputGroup
          value={newCountry.phone_code}
          key="phoneCode"
          type="text"
          large={true}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setCountry({
              ...newCountry,
              phone_code: (evt.target as HTMLInputElement).value as string,
            });
          }}
        />
      </Label>

      <Label>
        Contact info
        <TextArea
          value={newCountry.contact}
          fill={true}
          key="contactInfo"
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setCountry({
              ...newCountry,
              contact: (evt.target as HTMLInputElement).value as string,
            });
          }}
        />
      </Label>
    </>
  );
};


interface TSCountryCommunicationDetailsEditorProps {
  date: Date,
  contents: any,
  onChange: (newDate: Date, newContents: any) => void,
}
const TSCountryCommunicationDetailsEditor: React.FC<TSCountryCommunicationDetailsEditorProps> =
    function ({ date, contents, onChange }) {

  const [newDate, setDate] = useState(date);
  const [newContents, setContents] = useState(Object.assign({}, contents));

  useEffect(() => {
    onChange(newDate, newContents);
  }, [newDate, newContents]);

  return (
    <div className={styles.tsCountryCommunicationEditor}>
      <FormGroup
          label="Communication date"
          intent="primary">
        <DatePicker
          key="datePicker"
          canClearSelection={false}
          value={newDate}
          onChange={(val: Date) => setDate(val)}
        />
      </FormGroup>

      <FormGroup
          label="Communication contents"
          intent="primary">
        <FreeformContents
          doc={newContents}
          onChange={(updatedDoc: any) => {
            setContents((previousDoc: any) => {
              return {
                ...previousDoc,
                ...JSON.parse(JSON.stringify(updatedDoc, null, 2)),
              };
            });
          }}
        />
      </FormGroup>
    </div>
  );
};
