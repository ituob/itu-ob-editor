import React from 'react';
import { EditorState } from 'prosemirror-state';
import { Editor, MenuBar } from '@aeaton/react-prosemirror';
import { options, menu } from '@aeaton/react-prosemirror-config-default';


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

    return (
      <>
        <MenuBar menu={menu} view={this.view} />
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
