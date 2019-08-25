import React from 'react';

import { Workspace } from 'main/storage';
import { OBIssue } from 'main/issues/models';
import { Message } from 'main/issues/messages';

import {
  isApprovedRecommendations,
  isRunningAnnexes,
  isAmendment,
  isTelephoneService,
} from 'main/issues/messages';

import { ApprovedRecommendationsEditor } from './messages/approved_recommendations';
import { RunningAnnexesEditor } from './messages/running_annexes';
import { TelephoneServiceMessageEditor } from './messages/telephone_service';
import { AmendmentEditor } from './messages/amendment';


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

export function getMessageEditor(msg: Message): React.FC<MessageEditorProps> {
  if (isApprovedRecommendations(msg)) {
    return ApprovedRecommendationsEditor;
  } else if (isRunningAnnexes(msg)) {
    return RunningAnnexesEditor;
  } else if (isTelephoneService(msg)) {
    return TelephoneServiceMessageEditor;
  } else if (isAmendment(msg)) {
    return AmendmentEditor;
  } else {
    return () => <p>Messages of type {msg.type} aren’t supported yet.</p>
    //throw new Error("Unknown message type");
  }
}
