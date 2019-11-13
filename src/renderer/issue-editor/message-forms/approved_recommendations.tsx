import * as moment from 'moment';
import React, { useState, useEffect } from 'react';

import { Button, Label, InputGroup } from '@blueprintjs/core';
import { AddCardTrigger, SimpleEditableCard } from 'sse/renderer/widgets/editable-card-list';

import { ITURecCode, ITURecVersion } from 'models/recommendations';
import { ApprovedRecommendationsMessage } from 'models/messages/approved_recommendations';

import { MessageFormProps, MessageEditorDialog } from '../message-editor';


export const MessageForm: React.FC<MessageFormProps> = function (props) {
  const [newRecDialogStatus, toggleNewRecDialogStatus] = useState(false);
  const [recs, updateRecs] = useState(
    (props.message as ApprovedRecommendationsMessage).items);

  useEffect(() => {
    props.onChange({ items: recs });
  }, [JSON.stringify(recs)]);

  return (
    <>
      <AddCardTrigger
        label="Add an approved recommendation"
        highlight={Object.entries(recs).length < 1}
        key="addNew"
        onClick={() => {
          toggleNewRecDialogStatus(true);
        }}
      />

      <>
        {Object.entries(recs).map(([code, version]: [string, string]) => {
          const pub = props.workspace.recommendations[code];
          const title = pub ? pub.title.en : '';
          return (
            <SimpleEditableCard
              key={code}
              onDelete={() => {
                updateRecs((recs) => { const { [code]: _, ...newRecs } = recs; return newRecs; });
              }}>
              <strong>{`${code} (${moment(version).format('YYYY-MM')})`}</strong>
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
              updateRecs(recs => {
                var newRecs = { ...recs };
                newRecs[code] = version;
                return newRecs;
              });
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
