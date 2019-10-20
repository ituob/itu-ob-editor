import React from 'react';
import { EditorState } from 'prosemirror-state';
import { Editor, MenuBar } from '@aeaton/react-prosemirror';
import { options, menu } from '@aeaton/react-prosemirror-config-default';


type NodePath = { type: { name: string } }[];
type Range = { $to: { path: NodePath }, $from: { path: NodePath } };
type Selection = { ranges: Range[] };


class ProseMirrorAdapter extends Editor {
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
        <MenuBar menu={_menu} view={this.view} />
        {editor}
      </>
    );
  }
}

interface FreeformContentsProps {
  onChange: (doc: any) => void,

  // Hopefully, a well-formed document structure
  doc: any,
}
export const FreeformContents: React.FC<FreeformContentsProps> = function ({ onChange, doc }) {
  let initialDoc: any;
  if (Object.keys(doc).length > 0) {
    initialDoc = options.schema.nodeFromJSON(Object.assign({}, doc));
  } else {
    initialDoc = options.schema.topNodeType.createAndFill();
  }
  const opts = Object.assign({}, options, { doc: initialDoc });

  return (
    <ProseMirrorAdapter
      options={opts}
      autofocus
      onChange={onChange}
    />
  );
};


function isInsideNode(withName: string, selection: Selection) {
  var isInsideTable = true;
  for (const range of selection.ranges) {
    const pathComponent = range.$to.path[3];
    if (pathComponent) {
      isInsideTable = range.$to.path[3].type.name === withName;
      if (!isInsideTable) {
        break;
      }
    } else {
      break;
    }
  }
  return isInsideTable;
}


function adjustMenu(menu: any, selection: Selection) {
  var _menu = Object.assign({}, menu);
  if (!isInsideNode('table', selection)) {
    delete _menu.table;
  }
  return _menu;
}
