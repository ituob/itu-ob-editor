import React, { useContext } from 'react';
import { LangConfigContext } from '@riboseinc/coulomb/localizer/renderer/context';
import { FreeformMessage } from 'models/freeform-message';

import { FreeformContents } from '../freeform-contents';
import { MessageFormProps } from '../message-editor';


export const MessageForm: React.FC<MessageFormProps> = function ({ message, onChange }) {
  const lang = useContext(LangConfigContext);
  const msg = message as FreeformMessage;

  return (
    <FreeformContents
      defaultValue={(msg.contents || {})[lang.default] || {}}
      onChange={(updatedDoc) => {
        onChange({ ...msg, contents: { ...msg.contents, [lang.default]: updatedDoc } });
      }}
    />
  );
};
