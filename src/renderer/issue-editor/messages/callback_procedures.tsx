import React from 'react';
import { NonIdealState } from '@blueprintjs/core';
import { MessageEditorProps } from '../message-editor';


export const MessageEditor: React.FC<MessageEditorProps> = function () {
  return (
    <>
      <NonIdealState
        icon="tick"
        title="Done"
        description="This message does not require content." />
    </>
  );
};
