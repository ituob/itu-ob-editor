import React from 'react';

import { Classes, Dialog } from '@blueprintjs/core';

import { OBIssue } from 'main/issues/models';
import { Message } from 'main/issues/messages';

import * as styles from './styles.scss';


/* New message prompt props. */

export interface NewMessagePromptProps {
  idx: number,
  issue: OBIssue,
  handleNewMessage: (msg: Message, atIndex: number) => void,
}


interface MessageEditorDialogProps {
  isOpen: boolean,
  onClose: () => void,
  key?: string,
  title?: string,
  width?: string,
  saveButton?: JSX.Element,
  className?: string,
}
export const MessageEditorDialog: React.FC<MessageEditorDialogProps> = function (props) {
  return (
    <Dialog
        key={props.key || "dialog"}
        title={props.title || undefined}
        isOpen={props.isOpen}
        className={props.className || styles.messageEditorDialog}
        onClose={props.onClose}
        style={props.width ? { width: props.width } : {}}
      >
      <div className={Classes.DIALOG_BODY}>
        {props.children}
      </div>

      {props.saveButton
        ? <div className={Classes.DIALOG_FOOTER}>
            {props.saveButton}
          </div>
        : ''}
    </Dialog>
  );
};
