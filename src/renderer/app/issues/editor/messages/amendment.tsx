import React from 'react';
import { Button, Card } from '@blueprintjs/core';
import { PaneHeader } from 'renderer/app/widgets/pane-header';

import { AmendmentMessage } from 'main/issues/messages/amendment';
import { FreeformContents } from '../freeform-contents';
import { MessageEditorProps } from '../message-editor';


export const AmendmentEditor: React.FC<MessageEditorProps> = function ({ message, onChange }) {
  var doc = Object.assign({}, (message as AmendmentMessage).contents);

  return (
    <>
      <PaneHeader>Amendment</PaneHeader>

      <Card>
        <FreeformContents
          doc={doc}
          onChange={(updatedDoc) => {
            Object.keys(doc).forEach(function(key) {
              delete doc[key];
            });
            Object.assign(doc, JSON.parse(JSON.stringify(updatedDoc, null, 2)));
          }}
        />

        <Button
          onClick={() => {
            console.debug("updated", doc);
            console.debug("updated", Object.assign({}, (message as AmendmentMessage), { contents: doc }));
            onChange(Object.assign({}, (message as AmendmentMessage), { contents: doc }));
          }}
          text="Save"
          intent="primary"
        />
      </Card>
    </>
  );
}
