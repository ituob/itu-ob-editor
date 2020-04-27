import React, { useMemo, useState, useEffect, useContext } from 'react';
import { Tooltip, H4, Label, Button, FormGroup, InputGroup, TextArea } from '@blueprintjs/core';
import { DatePicker } from '@blueprintjs/datetime';

import { AddCardTrigger, SimpleEditableCard } from 'coulomb/renderer/widgets/editable-card-list';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import {
  TSCommunication,
  TSCountryCommunicationSet,
  Message as TelephoneServiceMessageV2,
} from 'models/messages/telephone_service_2';

import { DateStamp } from 'renderer/widgets/dates';

import { FreeformContents } from '../freeform-contents';
import { MessageFormProps, MessageEditorDialog } from '../message-editor';

import * as styles from '../styles.scss';


function getNewCommStub(lang: string): TSCommunication {
  return {
    date: new Date(),
    contents: { [lang]: {} },
  };
}


function getNewCountryStub(lang: string): TSCountryCommunicationSet {
  return {
    country_name: { [lang]: '' },
    phone_code: '',
    contact: { [lang]: '' },
    communications: [],
  };
}


export const MessageForm: React.FC<MessageFormProps> = function ({ message, onChange }) {
  const [countryCommSets, updateCountryCommSets] = useState((message as TelephoneServiceMessageV2).contents as TSCountryCommunicationSet[])

  const lang = useContext(LangConfigContext);

  const [activeCountryIdx, setActiveCountryIdx] = useState(0);
  const [activeCommIdx, setActiveCommIdx] = useState(0);
  const [newCountryDialogState, toggleNewCountryDialogState] = useState(false);
  const [editCountryDialogState, toggleEditCountryDialogState] = useState(false);
  const [newCommDialogState, toggleNewCommDialogState] = useState(false);
  const [editCommDialogState, toggleEditCommDialogState] = useState(false);

  function _onChange(newContents: TSCountryCommunicationSet[]) {
    updateCountryCommSets(newContents);
    onChange({ contents: newContents });
  }

  function updateCommunication(countryIdx: number, commIdx: number, updatedComm: TSCommunication) {
    return countryCommSets.map((countryCommSet: TSCountryCommunicationSet, _idx: number) => {
      if (countryIdx === _idx) {
        return {
          ...countryCommSet,
          communications: countryCommSet.communications.map((comm: TSCommunication, _idx: number) => {
            if (_idx === commIdx) {
              return updatedComm;
            } else {
              return comm;
            }
          }),
        };
      } else {
        return countryCommSet;
      }
    });
  }

  return (
    <>
      <AddCardTrigger
        key="addFirstCountry"
        label="Add country or area"
        highlight={countryCommSets.length < 1}
        onClick={() => {
          setActiveCountryIdx(0);
          toggleNewCountryDialogState(true);
        }}
      />

      {countryCommSets.length > 0
        ? countryCommSets.map((countryCommSet: TSCountryCommunicationSet, countryIdx: number) => (
          <>
            <SimpleEditableCard extended={true} key={countryIdx} onDelete={() => {
              var newContents = [...countryCommSets];
              newContents.splice(countryIdx, 1);
              _onChange(newContents);
            }}>
              <H4>
                {countryCommSet.country_name[lang.default]}
                &emsp;
                +{countryCommSet.phone_code}
              </H4>

              <div className={styles.tsCountryButtons}>
                <EditCountryPrompt
                  key="editCountry"
                  title="Open area details"
                  onOpen={() => {
                    setActiveCountryIdx(countryIdx);
                    toggleEditCountryDialogState(true);
                  }}
                />

                <AddCommunicationPrompt
                  shorten={countryCommSet.communications.length > 0}
                  key="addFirstComm"
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
                          commDate={comm.date}
                          onOpen={() => {
                            setActiveCountryIdx(countryIdx);
                            setActiveCommIdx(commIdx);
                            toggleEditCommDialogState(true);
                          }}
                        />

                        <Tooltip content="Delete this communication">
                          <Button
                            icon="delete"
                            minimal={true}
                            intent="danger"
                            className={styles.deleteCommButton}
                            onClick={() => {
                              var newComms = [...countryCommSets[countryIdx].communications];
                              newComms.splice(commIdx, 1);

                              var newContents = [...countryCommSets];
                              newContents[countryIdx] = {
                                ...newContents[countryIdx],
                                communications: newComms,
                              };

                              _onChange(newContents);
                            }} />
                        </Tooltip>

                        <AddCommunicationPrompt
                          key="addCommAfter"
                          shorten={countryCommSet.communications.length > 0}
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
              label="Add a country"
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
            countryCommSet={getNewCountryStub(lang.default)}
            isOpen={true}
            onClose={() => toggleNewCountryDialogState(false)}
            onSave={(countryCommSet: TSCountryCommunicationSet) => {
              var newContents = [...countryCommSets];
              newContents.splice(activeCountryIdx, 0, countryCommSet);
              _onChange(newContents);
              toggleNewCountryDialogState(false);
            }}
          />
        : ''}

      {editCountryDialogState === true && countryCommSets[activeCountryIdx] !== undefined
        ? <EditCountryDialog
            key="editCountry"
            title="Geographical area & contact information"
            countryCommSet={countryCommSets[activeCountryIdx]}
            isOpen={true}
            onClose={() => toggleEditCountryDialogState(false)}
            onSave={(countryCommSet) => {
              var newContents = [...countryCommSets];
              newContents[activeCountryIdx] = {
                communications: countryCommSet.communications,
                phone_code: countryCommSet.phone_code,
                country_name: countryCommSet.country_name,
                contact: countryCommSet.contact,
              };
              _onChange(newContents);
              toggleEditCountryDialogState(false);
            }}
          />
        : ''}

      {newCommDialogState === true
        ? <EditCommunicationDialog
            key="addCommunication"
            title="Add communication"
            comm={getNewCommStub(lang.default)}
            isOpen={true}
            onClose={() => toggleNewCommDialogState(false)}
            onSave={(comm) => {
              var newContents = [...countryCommSets];
              var newComms = [...newContents[activeCountryIdx].communications];
              newComms.splice(activeCommIdx, 0, comm);
              newContents[activeCountryIdx] = {
                ...newContents[activeCountryIdx],
                communications: newComms,
              };
              _onChange(newContents);
              toggleNewCommDialogState(false);
            }}
          />
        : ''}

      {editCommDialogState === true && ((countryCommSets[activeCountryIdx] || {}).communications || [])[activeCommIdx] !== undefined
        ? <EditCommunicationDialog
            key="editCommunication"
            title={`Communication no. ${activeCommIdx + 1}`}
            comm={countryCommSets[activeCountryIdx].communications[activeCommIdx]}
            isOpen={true}
            onClose={() => toggleEditCommDialogState(false)}
            onSave={(comm) => {
              const newContents = updateCommunication(activeCountryIdx, activeCommIdx, comm);
              _onChange(newContents);
              toggleEditCommDialogState(false);
            }}
          />
        : ''}

    </>
  );
};


/* Prompts */


interface EditCountryPromptProps { onOpen: () => void, title?: JSX.Element | string }
const EditCountryPrompt: React.FC<EditCountryPromptProps> = function ({ onOpen, title }) {
  return (
    <Button
        icon="edit"
        onClick={onOpen}
        title="Open geographical area">
      {title}
    </Button>
  );
};


interface AddCommunicationPromptProps { onOpen: () => void, title?: JSX.Element, shorten?: boolean }
const AddCommunicationPrompt: React.FC<AddCommunicationPromptProps> = function ({ onOpen, shorten }) {
  const title = "Add communication from this area";
  const btn = (
    <Button
        icon="plus"
        onClick={onOpen}
        minimal={shorten}
        intent="primary">
      {!shorten ? title : undefined}
    </Button>
  );
  if (!shorten) {
    return btn;
  } else {
    return <Tooltip content={title}>{btn}</Tooltip>;
  }
};


interface EditCommunicationPromptProps { onOpen: () => void, commDate: Date }
const EditCommunicationPrompt: React.FC<EditCommunicationPromptProps> = function ({ onOpen, commDate }) {
  return (
    <Button
        icon="edit"
        className={styles.openCommButton}
        onClick={onOpen}
        title="Open communication">
      Open communication of <DateStamp date={commDate} />
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
  const lang = useContext(LangConfigContext);

  const [newCountry, setCountry] = useState(Object.assign({}, countryCommSet));

  function _onSave() {
    if (
        newCountry.country_name[lang.default] != '' &&
        newCountry.phone_code != '' &&
        newCountry.contact[lang.default] != '') {
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
  const lang = useContext(LangConfigContext);

  const [commDate, setCommDate] = useState(comm.date);
  const [commContents, setCommContents] = useState(comm.contents[lang.default]);

  function _onSave() {
    onSave({ date: commDate, contents: { [lang.default]: commContents }});
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
  const lang = useContext(LangConfigContext);

  const [newCountry, setCountry] = useState(country);

  useEffect(() => {
    onChange(newCountry);
  }, [newCountry]);

  return (
    <>
      <Label>
        Country or geographical area name
        <InputGroup
          value={newCountry.country_name[lang.default]}
          key="countryName"
          type="text"
          large={true}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setCountry({
              ...newCountry,
              country_name: {
                ...newCountry.country_name,
                [lang.default]: (evt.target as HTMLInputElement).value as string,
              },
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
          value={newCountry.contact[lang.default]}
          fill={true}
          key="contactInfo"
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setCountry({
              ...newCountry,
              contact: {
                ...newCountry.contact,
                [lang.default]: (evt.target as HTMLInputElement).value as string,
              },
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

  const contentsEditor = useMemo(() => (
    <FreeformContents
      defaultValue={newContents}
      onChange={(updatedDoc: any) => {
        setContents((previousDoc: any) => {
          return {
            ...previousDoc,
            ...JSON.parse(JSON.stringify(updatedDoc, null, 2)),
          };
        });
      }}
    />
  ), [1]);

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
          contentClassName={styles.tsCommunicationFormContents}
          intent="primary">
        {contentsEditor}
      </FormGroup>
    </div>
  );
};
