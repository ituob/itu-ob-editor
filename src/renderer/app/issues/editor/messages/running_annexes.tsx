import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Button, Label, InputGroup } from '@blueprintjs/core';
import { AddCardTrigger, SimpleEditableCard } from 'renderer/app/widgets/editable-card-list';
import * as widgetStyles from 'renderer/app/widgets/styles.scss';

import { RunningAnnexesMessage } from 'main/issues/messages/running_annexes';

import { DateStamp } from 'renderer/app/dates';
import { RunningAnnex, getRunningAnnexesForIssue } from 'renderer/app/issues/running-annexes';
import { MessageEditorProps, MessageEditorDialog } from '../message-editor';
import * as styles from '../styles.scss';


export const MessageEditor: React.FC<MessageEditorProps> = function (props) {
  const [extraPubIds, updateExtraPubIds] = useState(
    (props.message as RunningAnnexesMessage).extra_links);

  useEffect(() => {
    props.onChange({ extra_links: extraPubIds });
  }, [JSON.stringify(extraPubIds)]);

  const runningAnnexes = getRunningAnnexesForIssue(
    props.issue,
    props.workspace.issues,
    props.workspace.publications);

  return (
    <>
      <h2 key="paneHeader" className={widgetStyles.paneHeader}>Lists Annexed</h2>

      <Tabs className={styles.messageEditorTabs}>
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
    </>
  );
};


const RunningAnnexes: React.FC<{ annexes: RunningAnnex[] }> = function ({ annexes }) {
  return (
    <>
      {annexes.map((annex: RunningAnnex) => (
        <SimpleEditableCard key={annex.publication.id}>
          <strong>{annex.annexedTo.id}:</strong>
          &emsp;
          {annex.publication.title.en}
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
    <>
      <AddCardTrigger key="addFirst" onClick={() => {
        setActiveItemIndex(0);
        toggleExtraItemDialogState(true)
      }} />

      {pubIds.map((pubId: string, idx: number) => (
        <>
          <SimpleEditableCard
              key="publication"
              onDelete={() => {
                updateIds(pubIds.filter(id => id !== pubId));
              }}>
            <strong>{pubId}</strong>
          </SimpleEditableCard>

          <AddCardTrigger key="addNewAfter" onClick={() => {
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
    </>
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
