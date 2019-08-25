import React, { useState } from 'react';
import { Card, Drawer, H5, Position, Navbar, NavbarGroup, Button, InputGroup } from '@blueprintjs/core';

import { ApprovedRecommendationsMessage } from 'main/issues/messages/approved_recommendations';

import { MessageEditorProps } from '../message-editor';


export const ApprovedRecommendationsEditor: React.FC<MessageEditorProps> = function (props) {
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
