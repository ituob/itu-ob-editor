import React, { useContext } from 'react';
import { Button } from '@blueprintjs/core';

import { PaneHeader } from 'sse/renderer/widgets/pane-header';
import { LangConfigContext } from 'sse/localizer/renderer';

import { AmendmentMessage } from 'models/messages/amendment';

import { FreeformContents } from '../freeform-contents';
import { MessageEditorProps } from '../message-editor';

import * as styles from '../styles.scss';


export const AmendmentEditor: React.FC<MessageEditorProps> = function ({ message, onChange }) {
  const lang = useContext(LangConfigContext);
  const msg = message as AmendmentMessage;

  var doc: any = (msg.contents || {})[lang.default] || {};

  return (
    <>
      <PaneHeader align="left" className={styles.inflexibleEditorPaneHeader}>Amendment</PaneHeader>

      <FreeformContents
        className={styles.freeformEditor}
        doc={doc}
        onChange={(updatedDoc) => { updateObjectInPlace(doc, updatedDoc); }}
      />

      <Button
        className={styles.freeformEditorSaveButton}
        onClick={() => {
          onChange(Object.assign({}, msg, { contents: { ...msg.contents, [lang.default]: doc } }));
        }}
        large={true}
        text="Save"
        intent="primary"
      />
    </>
  );
}


function updateObjectInPlace(doc: any, newDoc: any) {
  Object.keys(doc).forEach(function(key) { delete doc[key]; });
  Object.assign(doc, JSON.parse(JSON.stringify(newDoc, null, 2)));
}
