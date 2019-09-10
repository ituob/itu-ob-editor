import React from 'react';
import { MessagePlugin, MessageEditorProps } from '../base';


export interface MessageModel {
  type: "telephone_service",
  contents: any,
}


const Editor: React.FC<MessageEditorProps> = function () {
  return <p>Old telephone service message…</p>;
};


export const msgType: MessagePlugin<MessageModel> = {
  getLabel: (msg) => { return { text: "TS (old)" } },
  getEditor: () => { return Editor },
  promptTitle: "Telephone Service (old)",
};
