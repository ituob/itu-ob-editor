import * as React from 'react';
import { useState } from 'react';
import { UL, InputGroup, Button, Drawer, Card, H5 } from '@blueprintjs/core';
import { Workspace } from 'renderer/app/storage';
import {
  Message,
  ApprovedRecommendationsMessage,
  RunningAnnexesMessage,
} from '../models';


// TODO: Turn those functions into one generic function
function isApprovedRecommendations(msg: Message): msg is ApprovedRecommendationsMessage {
  return msg.type === 'approved_recommendations';
}
function isRunningAnnexes(msg: Message): msg is RunningAnnexesMessage {
  return msg.type === 'running_annexes';
}

interface MessageBodyProps {
  workspace: Workspace,
  onChange: (updatedMessage: any) => void,
}

export function getMessageTemplate(msg: Message): {
    title: string,
    getBodyView: (props: MessageBodyProps) => any } {

  if (isApprovedRecommendations(msg)) {
    const recommendations = msg.items;

    return {
      title: "Approved Recommendations",
      getBodyView: (props) => {
        const [ addDialogStatus, updateAddDialogStatus ] = useState(false);
        const [ newRecCode, updateNewRecCode ] = useState('');
        const [ newRecVersion, updateNewRecVersion ] = useState('');

        function onClose() {
          if (newRecCode != '' && newRecVersion != '') {
            var newRecs = recommendations;
            newRecs[newRecCode] = newRecVersion;
            props.onChange({ items: newRecs });
          }
          updateAddDialogStatus(false);
        }

        return (
          <React.Fragment>
            <div>
              {Object.entries(recommendations).map(([code, version]: [string, string]) => {
                const pub = props.workspace.recommendations[code];
                const title = pub ? pub.title.en : '';
                return <Card key={code}><H5>{code} ({version})</H5>{title}</Card>
              })}
            </div>
            <Button onClick={() => updateAddDialogStatus(true)}>Add new</Button>
            <Drawer isOpen={addDialogStatus} onClose={onClose}>
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
      },
    };
  }

  else if (isRunningAnnexes(msg)) {
    const extraPublicationIDs = msg.extra_links;
    return {
      title: "Lists Annexed",
      getBodyView: (props) => {
        return (
          <UL>
            {extraPublicationIDs.map((pubId) => (
              <li key={pubId}>{pubId}</li>
            ))}
          </UL>
        );
      },
    };
  }

  return {
    title: "Message",
    getBodyView: (props) => (
      <span>(unable to display)</span>
    )
  };
}
