import React, { useContext } from 'react';
import { Button, Card } from '@blueprintjs/core';

import { PaneHeader } from 'sse/renderer/widgets/pane-header';
import { LangConfigContext } from 'sse/localizer/renderer';

import { AmendmentMessage } from 'models/messages/amendment';

import { FreeformContents } from '../freeform-contents';
import { MessageEditorProps } from '../message-editor';


export const AmendmentEditor: React.FC<MessageEditorProps> = function ({ message, onChange }) {
  const lang = useContext(LangConfigContext);

  var doc = Object.assign({}, (message as AmendmentMessage).contents[lang.default]);

  return (
    <>
      <PaneHeader align="left">Amendment</PaneHeader>

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
            const msg = message as AmendmentMessage;
            console.debug("updated", Object.assign({}, msg, { contents: { ...msg.contents, [lang.default]: doc } }));
            onChange(Object.assign({}, msg, { contents: { ...msg.contents, [lang.default]: doc } }));
          }}
          text="Save"
          intent="primary"
        />
      </Card>
    </>
  );
}
