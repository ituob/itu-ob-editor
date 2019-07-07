import * as React from 'react';
import { useState } from 'react';
import { Navbar, NavbarGroup, Position, UL, InputGroup, Button, Drawer, Card, H5 } from '@blueprintjs/core';
import { Workspace } from 'renderer/app/storage';
import { DateStamp } from 'renderer/app/dates';

import {
  OBIssue,
  Message,
  MessageType,
  AmendmentMessage,
  ApprovedRecommendationsMessage,
  RunningAnnexesMessage,
} from '../models';

import { RunningAnnex, getRunningAnnexesForIssue } from '../running-annexes';


// TODO: Turn those functions into one generic function
function isApprovedRecommendations(msg: Message): msg is ApprovedRecommendationsMessage {
  return msg.type === 'approved_recommendations';
}
function isRunningAnnexes(msg: Message): msg is RunningAnnexesMessage {
  return msg.type === 'running_annexes';
}


// TODO: Turn message types into classes and below into constructors
export function createMessage(type: MessageType): Message {
  var msg = { type: type };

  if (type === 'approved_recommendations') {
    return {
      ...msg,
      items: {},
    } as Message;
  } else if (type === 'running_annexes') {
    return {
      ...msg,
      extra_links: [],
    } as Message;
  } else if (type === 'telephone_service') {
    return {
      ...msg,
      contents: {},
    } as Message;
  } else if (type === 'service_restrictions') {
    return {
      ...msg,
      items: [],
    } as Message;
  } else if (type === 'callback_procedures') {
    return {
      ...msg,
    } as Message;
  } else if (type === 'amendment') {
    return {
      ...msg,
    } as Message;
  } else {
    throw new Error("Unknown message type requested");
  }
}


export function getMessageTypeTitle(type: MessageType): string {
  if (type === 'approved_recommendations') {
    return  "Approved Recommendations";
  } else if (type === 'running_annexes') {
    return "Lists Annexed";
  } else if (type === 'telephone_service') {
    return "Telephone Service";
  } else if (type === 'callback_procedures') {
    return "Call-back and Alternative Calling Procedures";
  } else if (type === 'custom') {
    return "Custom";
  } else if (type === 'amendment') {
    return  "Amendment";
  } else if (type === 'service_restrictions') {
    return "Service Restrictions";
  } else {
    return type;
    //throw new Error(`Unknown message type: ${msg.type}`);
  }
}


export function getMessageSubtitle(msg: Message): string | undefined {
  if (msg.type === 'amendment') {
    return `to ${((msg as AmendmentMessage).target || {}).publication}`;
  }
  return undefined;
}


export interface MessageEditorProps {
  workspace: Workspace,
  issue: OBIssue,
  message: Message,
  onChange: (updatedMessage: any) => void,
}
interface MessageEditor {
  (props: MessageEditorProps): any
}

const ApprovedRecommendationsEditor: MessageEditor = function (props) {
  const [ addDialogStatus, updateAddDialogStatus ] = useState(false);
  const [ newRecCode, updateNewRecCode ] = useState('');
  const [ newRecVersion, updateNewRecVersion ] = useState('');

  const recommendations = (props.message as ApprovedRecommendationsMessage).items;

  function onClose() {
    if (newRecCode != '' && newRecVersion != '') {
      var newRecs = recommendations;
      newRecs[newRecCode] = newRecVersion;
      props.onChange({ items: newRecs });
    }
    updateAddDialogStatus(false);
    updateNewRecCode('');
    updateNewRecVersion('');
  }

  return (
    <React.Fragment>
      <Navbar>
        <NavbarGroup>
          <Button onClick={() => updateAddDialogStatus(true)}>Add new…</Button>
        </NavbarGroup>
      </Navbar>
      <Card>
        {Object.entries(recommendations).map(([code, version]: [string, string]) => {
          const pub = props.workspace.recommendations[code];
          const title = pub ? pub.title.en : '';
          return <Card key={code}><H5>{code} ({version})</H5>{title}</Card>
        })}
      </Card>
      <Drawer usePortal={false} position={Position.TOP} isOpen={addDialogStatus} onClose={onClose}>
        <InputGroup
          value={newRecCode}
          placeholder="Code"
          onChange={(evt: React.FormEvent<HTMLElement>) =>
            updateNewRecCode((evt.target as HTMLInputElement).value as string)}
        />
        <InputGroup
          value={newRecVersion}
          placeholder="Version"
          onChange={(evt: React.FormEvent<HTMLElement>) =>
            updateNewRecVersion((evt.target as HTMLInputElement).value as string)}
        />
      </Drawer>
    </React.Fragment>
  );
};

const RunningAnnexesEditor: MessageEditor = function (props) {
  const extraPublicationIDs = (props.message as RunningAnnexesMessage).extra_links;
  const runningAnnexes = getRunningAnnexesForIssue(
    props.issue,
    props.workspace.issues,
    props.workspace.publications);

  return (
    <React.Fragment>
      <UL key={'lists-annexed'}>
        {runningAnnexes.map((annex: RunningAnnex) => (
          <li key={annex.publication.id}>
            <strong>{annex.annexedTo.id}:</strong>
            &emsp;
            {annex.publication.title.en}
            &emsp;
            (position on <DateStamp date={annex.positionOn} />)
          </li>
        ))}
      </UL>
      <UL key={'lists-external'}>
        {extraPublicationIDs.map((pubId) => (
          <li key={pubId}>{pubId}</li>
        ))}
      </UL>
    </React.Fragment>
  );
};

export function getMessageEditor(msg: Message): MessageEditor {
  if (isApprovedRecommendations(msg)) {
    return ApprovedRecommendationsEditor;
  } else if (isRunningAnnexes(msg)) {
    return RunningAnnexesEditor;
  } else {
    return () => <p>Messages of type {msg.type} aren’t supported yet.</p>
    //throw new Error("Unknown message type");
  }
}