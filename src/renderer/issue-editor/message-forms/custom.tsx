import React, { useContext } from 'react';

import { Callout, FormGroup, InputGroup } from '@blueprintjs/core';
import { LangConfigContext } from 'sse/localizer/renderer';

import { CustomMessage } from 'models/messages/custom';
import { FreeformContents } from '../freeform-contents';
import { MessageEditorProps } from '../message-editor';


export const MessageForm: React.FC<MessageEditorProps> = function ({ message, onChange }) {
  const lang = useContext(LangConfigContext);
  const msg = message as CustomMessage;

  // This is not the conventional React way.
  // Accommodates uncontrolled freeform editor widget.

  var title: string = (msg.title || {})[lang.default] || '';
  var doc: any = (msg.contents || {})[lang.default] || {};

  function _onChange() {
    onChange({
      ...msg,
      contents: { ...msg.contents, [lang.default]: doc },
      title: { ...msg.title, [lang.default]: title },
    });
  }

  return (
    <>
      <Callout>
        <FormGroup label="Title in English">
          <InputGroup
            type="text"
            large={true}
            placeholder="Title"
            defaultValue={title}
            onChange={(event: React.FormEvent<HTMLElement>) => {
              title = (event.target as HTMLInputElement).value;
              _onChange();
            }}
          />
        </FormGroup>
      </Callout>

      <FreeformContents
        defaultValue={doc}
        onChange={(updatedDoc) => {
          doc = updatedDoc;
          _onChange();
        }}
      />
    </>
  );
};
