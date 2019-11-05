import React from 'react';
import { EditorState } from 'prosemirror-state';
import { Editor as BaseEditor, MenuBar } from '@aeaton/react-prosemirror';
import { options, menu } from '@aeaton/react-prosemirror-config-default';

import * as styles from './styles.scss';


type NodePath = { type: { name: string } }[];
type Range = { $to: { path: NodePath }, $from: { path: NodePath } };
type Selection = { ranges: Range[] };


class Editor extends BaseEditor {
  view: any;

  constructor(props: any) {
    super(props);
    this.loadNewDoc(props);
  }
  componentWillReceiveProps(props: any) {
    this.loadNewDoc(props);
  }
  loadNewDoc(props: any) {
    this.view.updateState(EditorState.create(props.options));
  }
  render() {
    const editor = super.render();
    const _menu = adjustMenu(menu, this.view.state.selection);

    return (
      <>
        <MenuBar menu={_menu} view={this.view} className={styles.freeformEditorToolbar} />
        {editor}
      </>
    );
  }
}


interface FreeformContentsProps {
  onChange: (doc: any) => void,
  className?: string,

  // Hopefully, a well-formed document structure
  doc: any,
}
export const FreeformContents: React.FC<FreeformContentsProps> = function ({ onChange, doc, className }) {
  let initialDoc: any;
  if (Object.keys(doc).length > 0) {
    initialDoc = options.schema.nodeFromJSON(Object.assign({}, doc));
  } else {
    initialDoc = options.schema.topNodeType.createAndFill();
  }
  const opts = Object.assign({}, options, { doc: initialDoc });

  return (
    <Editor
      options={opts}
      autofocus
      onChange={onChange}
      className={`${styles.freeformEditor} ${className || ''}`}
    />
  );
};


/* Utility functions */


/* Given base ProseMirror editor menu definition,
   adds or removes groups based on given selection
   and returns a copy. */

function adjustMenu(menu: any, selection: Selection) {
  var _menu = Object.assign({}, menu);

  // Hide Table button group unless selection is inside table cell
  if (!isInsideNodeWithName('table_cell', selection)) {
    delete _menu.table;
  }

  delete _menu.marks;
  delete _menu.insert.image;
  delete _menu.blocks.code_block;

  return _menu;
}


/* Returns true if all ranges in given ProseMirror selection
   terminate within nodes matching given node type name. */

function isInsideNodeWithName(withName: string, selection: Selection): boolean {
  var isInsideCell = true;

  rangeLoop:
  for (const range of selection.ranges) {
    rangeEdgeLoop:
    for (const rangeEdge of [range.$to, range.$from]) {
      for (const pathComponent of rangeEdge.path) {
        if (pathComponent.type && pathComponent.type.name === withName) {
          // Continue with the other side of selection range
          continue rangeEdgeLoop;
        }
      }
      // Getting to this point means this range boundary
      // is not terminating inside given node. Cancel everything, we’re out
      isInsideCell = false;
      break rangeLoop;
    }
  }
  return isInsideCell;
}
