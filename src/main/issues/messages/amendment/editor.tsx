import React from 'react';
import { Card, Button } from '@blueprintjs/core';

import { FreeformContents } from 'renderer/app/issues/editor/freeform-contents';
import { AmendmentMessage } from 'main/issues/messages/amendment';
import { MessageEditorProps } from '../base';


export const Editor: React.FC<MessageEditorProps> = function ({ message, onChange }) {
  var doc = Object.assign({}, (message as AmendmentMessage).contents);

  return (
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
  );
};
