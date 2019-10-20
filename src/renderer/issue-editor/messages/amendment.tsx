import React, { useMemo, useContext } from 'react';

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

  // Memoization ensures that updating upstream message in onChange() on every keystroke
  // doesn’t cause the editor to re-render, which loses cursor position and undo history.
  // Only re-render if amendment target changes, meaning a switch to another amendment message.
  const editor = useMemo(() => (
    <FreeformContents
      className={styles.freeformEditor}
      doc={doc}
      onChange={(updatedDoc) => {
        updateObjectInPlace(doc, updatedDoc);
        onChange(Object.assign({}, msg, { contents: { ...msg.contents, [lang.default]: doc } }));
      }}
    />
  ), [msg.target.publication]);

  return (
    <>
      <PaneHeader align="left" className={styles.inflexibleEditorPaneHeader}>Amendment</PaneHeader>
      {editor}
    </>
  );
}


function updateObjectInPlace(doc: any, newDoc: any) {
  Object.keys(doc).forEach(function(key) { delete doc[key]; });
  Object.assign(doc, JSON.parse(JSON.stringify(newDoc, null, 2)));
}
