import React, { useContext } from 'react';

import { Callout, FormGroup, InputGroup } from '@blueprintjs/core';
import { LangConfigContext } from '@riboseinc/coulomb/localizer/renderer/context';

import { Message as CustomMessage } from 'models/messages/custom';
import { FreeformContents } from '../freeform-contents';
import { MessageFormProps } from '../message-editor';


export const MessageForm: React.FC<MessageFormProps> = function ({ message, onChange }) {
  const lang = useContext(LangConfigContext);
  const msg = message as CustomMessage;

  // This is not the conventional React way.
  // Accommodates uncontrolled freeform editor widget.

  var title: string = (msg.title || {})[lang.default] || '';
  var doc: any = (msg.contents || {})[lang.default] || {};

  function _onChange() {
    if (onChange) {
      onChange({
        ...msg,
        contents: { ...msg.contents, [lang.default]: doc },
        title: { ...msg.title, [lang.default]: title },
      });
    }
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
            onChange={onChange
              ? (event: React.FormEvent<HTMLElement>) => {
                  title = (event.target as HTMLInputElement).value;
                  _onChange();
                }
              : undefined}
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
