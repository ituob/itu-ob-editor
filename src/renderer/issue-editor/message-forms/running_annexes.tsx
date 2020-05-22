import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Button, Label, InputGroup } from '@blueprintjs/core';

import { AddCardTrigger, SimpleEditableCard } from 'coulomb/renderer/widgets';

import { useRunningAnnexes } from 'renderer/hooks';
import { PublicationTitle } from 'renderer/widgets/publication-title';
import { DateStamp } from 'renderer/widgets/dates';

import { RunningAnnex } from 'models/running-annexes';
import { Message as RunningAnnexesMessage } from 'models/messages/running_annexes';

import { MessageFormProps, MessageEditorDialog } from '../message-editor';
import * as styles from '../styles.scss';


export const MessageForm: React.FC<MessageFormProps> = function (props) {
  const [extraPubIds, updateExtraPubIds] = useState(
    (props.message as RunningAnnexesMessage).extra_links);

  useEffect(() => {
    props.onChange({ extra_links: extraPubIds });
  }, [JSON.stringify(extraPubIds)]);

  const runningAnnexes = useRunningAnnexes(props.issue.id);

  return (
    <Tabs className={`${styles.messageEditorTabs} ${styles.paneBody}`}>
      <Tab
        id="autoAnnexes"
        title="Running annexes"
        panel={<RunningAnnexes annexes={runningAnnexes} />} />
      <Tab
        id="extraPublications"
        title="Extra publications"
        panel={
          <ExtraPublications
            pubIds={extraPubIds}
            updateIds={(newIds: string[]) => updateExtraPubIds(newIds)}
          />
        } />
    </Tabs>
  );
};


const RunningAnnexes: React.FC<{ annexes: RunningAnnex[] }> = function ({ annexes }) {
  return (
    <>
      {annexes.map((annex: RunningAnnex) => (
        <SimpleEditableCard key={annex.publicationID}>
          <strong>{annex.annexedTo.id}:</strong>
          &emsp;
          <PublicationTitle id={annex.publicationID} />
          &emsp;
          {annex.positionOn
            ? <span>(position on <DateStamp date={annex.positionOn} />)</span>
            : null}
        </SimpleEditableCard>
      ))}
    </>
  );
};

const ExtraPublications: React.FC<{ pubIds: string[], updateIds: (newIds: string[]) => void }> = function ({ pubIds, updateIds }) {
  const [extraItemDialogState, toggleExtraItemDialogState] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  return (
    <div className={pubIds.length < 1 ? styles.emptyExtraAnnexedPublicationsPane : undefined}>
      <AddCardTrigger
        key="addFirst"
        label="Add annexed publication"
        highlight={pubIds.length < 1}
        onClick={() => {
          setActiveItemIndex(0);
          toggleExtraItemDialogState(true)
        }}
      />

      {pubIds.map((pubId: string, idx: number) => (
        <>
          <SimpleEditableCard
              key="publication"
              onDelete={() => {
                updateIds(pubIds.filter(id => id !== pubId));
              }}>
            <PublicationTitle id={pubId} />
          </SimpleEditableCard>

          <AddCardTrigger key="addNewAfter" label="Add annexed publication" onClick={() => {
            setActiveItemIndex(idx + 1);
            toggleExtraItemDialogState(true)
          }} />
        </>
      ))}

      {extraItemDialogState === true 
        ? <AddExtraAnnexedListDialog
            key="addNewDialog"
            isOpen={true}
            onClose={() => toggleExtraItemDialogState(false)}
            onSave={(code) => {
              var newIds = [...pubIds];
              newIds.splice(activeItemIndex, 0, code);
              updateIds(newIds);
              toggleExtraItemDialogState(false);
            }}
          />
        : ''}
    </div>
  );
};


interface AddExtraAnnexedListDialogProps {
  isOpen: boolean,
  onSave: (pubCode: string) => void,
  onClose: () => void,
}
const AddExtraAnnexedListDialog: React.FC<AddExtraAnnexedListDialogProps> = function ({ isOpen, onSave, onClose }) {
  const [code, setCode] = useState('');

  function _onSave() {
    onSave(code);
    onClose();
  }

  return (
    <MessageEditorDialog
        title="Add extra annexed publication"
        isOpen={isOpen}
        onClose={onClose}
        saveButton={
          <Button
            intent="primary"
            disabled={code === ''}
            onClick={_onSave}>Add publication</Button>
        }>
      <Label key="code">
        Publication code
        <InputGroup
          value={code}
          placeholder="E.g., BUREAUFAX"
          type="text"
          large={true}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setCode((evt.target as HTMLInputElement).value as string);
          }}
        />
      </Label>
    </MessageEditorDialog>
  );
};
