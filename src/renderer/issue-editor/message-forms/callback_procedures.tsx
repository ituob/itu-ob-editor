import React from 'react';
import { NonIdealState } from '@blueprintjs/core';
import { MessageFormProps } from '../message-editor';


export const MessageForm: React.FC<MessageFormProps> = function () {
  return (
    <NonIdealState
      icon="tick"
      title="Done"
      description="This message does not require content." />
  );
};
