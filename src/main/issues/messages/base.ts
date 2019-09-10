import React from 'react';

import { Workspace } from 'main/storage';
import { OBIssue } from 'main/issues/models';
import { Message } from '.';


/* Message plugin base */

interface MessageLabel {
  text: string,
  suffix?: string,
  tooltip?: string,
}

export interface MessagePlugin<T> {
  getLabel: (msg: T) => MessageLabel,
  getEditor: () => React.FC<MessageEditorProps>,
  promptTitle: string,
}


/* Message editor spec.

   Editor implementations (React functional components) are given a ``message``
   and are expected to call ``onChange`` with updated message after user edits it.

   They are also provided ``workspace`` and ``issue`` for messages that involve
   other messages within current OB edition, or data from past editions. */

export interface MessageEditorProps {
  workspace: Workspace,
  issue: OBIssue,
  message: Message,
  onChange: (updatedMessage: any) => void,
}
