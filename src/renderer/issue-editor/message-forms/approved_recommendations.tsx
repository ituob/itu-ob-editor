import * as moment from 'moment';
import React, { useState } from 'react';

import { Button, Callout, Label, FormGroup, InputGroup } from '@blueprintjs/core';
import { AddCardTrigger, SimpleEditableCard } from '@riboseinc/coulomb/renderer/widgets/editable-card-list';

import { ITURecCode, ITURecVersion, ITURecommendation } from 'models/recommendations';
import { Message as ApprovedRecommendationsMessage } from 'models/messages/approved_recommendations';
import { app } from 'renderer/index';

import { MessageFormProps, MessageEditorDialog } from '../message-editor';

import * as styles from '../styles.scss';


export const MessageForm: React.FC<MessageFormProps> = function ({ message, onChange }) {
  const [msg, updateMsg] = useState(message as ApprovedRecommendationsMessage);

  const [newRecDialogStatus, toggleNewRecDialogStatus] = useState(false);
  const recs = app.useMany<ITURecommendation>('recommendations').objects;

  function _onChange(updatedMsg: { [K in keyof ApprovedRecommendationsMessage]?: ApprovedRecommendationsMessage[K] }) {
    updateMsg({ ...msg, ...updatedMsg });
    onChange({ ...msg, ...updatedMsg });
  }

  const hasApprovalDoc = (msg.by || '') !== '';
  const hasProceduresDoc = (msg.procedures || '') !== '';

  return (
    <>
      <Callout className={styles.approvedRecsMeta}>
        <FormGroup
            key="by"
            intent={!onChange || hasApprovalDoc ? undefined : "warning"}
            helperText={!onChange || hasApprovalDoc ? undefined : "Please specify the approving document reference."}
            label="Approved by:"
            labelInfo={onChange ? "(required)" : undefined}>
          <InputGroup
            type="text"
            disabled={!onChange}
            placeholder={onChange ? "e.g., AAP-184" : undefined}
            value={msg.by || ''}
            onChange={(event: React.FormEvent<HTMLElement>) => {
              _onChange({ by: (event.target as HTMLInputElement).value });
            }}
          />
        </FormGroup>
        <FormGroup
            key="procedures"
            intent={!onChange || hasProceduresDoc ? undefined : "warning"}
            helperText={!onChange || hasProceduresDoc ? undefined : "Please specify the procedures document reference."}
            label="In accordance with procedures outlined in:"
            labelInfo={onChange ? "(required)" : undefined}>
          <InputGroup
            type="text"
            disabled={!onChange}
            placeholder={onChange ? "e.g., Resolution 42" : undefined}
            value={msg.procedures || ''}
            onChange={(event: React.FormEvent<HTMLElement>) => {
              _onChange({ procedures: (event.target as HTMLInputElement).value });
            }}
          />
        </FormGroup>
      </Callout>

      <AddCardTrigger
        label="Add an approved recommendation"
        highlight={true}
        key="addNew"
        onClick={() => {
          toggleNewRecDialogStatus(true);
        }}
      />

      <>
        {Object.entries(msg.items).map(([code, version]: [string, string]) => {
          const rec = recs[code];
          const title = rec ? rec.title.en : '';
          return (
            <SimpleEditableCard
              key={code}
              onDelete={() => {
                var newRecs = { ...msg.items };
                delete newRecs[code];
                _onChange({ items: newRecs });
              }}>
              <strong>{code}</strong> ({moment(version).format('YYYY-MM')})
              &ensp;
              <em>{title}</em>
            </SimpleEditableCard>
          );
        })}
      </>

      {newRecDialogStatus === true
        ? <AddApprovedRecDialog
            key="addRec"
            isOpen={true}
            onClose={() => toggleNewRecDialogStatus(false)}
            onSave={(code, version) => {
              var newRecs = { ...msg.items };
              newRecs[code] = version;
              _onChange({ items: newRecs });
              toggleNewRecDialogStatus(false);
            }}
          />
        : ''}
    </>
  );
};


interface AddApprovedRecDialogProps {
  isOpen: boolean,
  onSave: (code: ITURecCode, version: ITURecVersion) => void,
  onClose: () => void,
}
const AddApprovedRecDialog: React.FC<AddApprovedRecDialogProps> = function ({ isOpen, onSave, onClose }) {
  const [code, setCode] = useState('');
  const [version, setVersion] = useState('');

  function _onSave() {
    onSave(code, version);
    onClose();
  }

  return (
    <MessageEditorDialog
        title="Add approved recommendation"
        isOpen={isOpen}
        onClose={onClose}
        saveButton={
          <Button
            intent="primary"
            disabled={code === '' || version == ''}
            onClick={_onSave}>Add recommendation</Button>
        }>
      <Label key="code">
        Code
        <InputGroup
          value={code}
          placeholder="E.g., “L.1015” or “Q.850 (2018) Amendment 1” (no quotes!)"
          type="text"
          large={true}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setCode((evt.target as HTMLInputElement).value as string);
          }}
        />
      </Label>
      <Label key="version">
        Version
        <InputGroup
          value={version}
          placeholder="E.g., 2019-04"
          type="text"
          large={true}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            setVersion((evt.target as HTMLInputElement).value as string);
          }}
        />
      </Label>
    </MessageEditorDialog>
  );
};
