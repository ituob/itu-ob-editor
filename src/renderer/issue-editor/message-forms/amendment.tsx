import React, { useContext } from 'react';
import { LangConfigContext } from 'sse/localizer/renderer';

import { AmendmentMessage } from 'models/messages/amendment';
import { FreeformContents } from '../freeform-contents';
import { MessageFormProps } from '../message-editor';


export const MessageForm: React.FC<MessageFormProps> = function ({ message, onChange }) {
  const lang = useContext(LangConfigContext);
  const msg = message as AmendmentMessage;

  return (
    <FreeformContents
      defaultValue={(msg.contents || {})[lang.default] || {}}
      onChange={(updatedDoc) => {
        onChange({ ...msg, contents: { ...msg.contents, [lang.default]: updatedDoc } });
      }}
    />
  );
};
