/// <reference types="node" />

interface OptOutProps {
  [key: string]: any;
}
interface OptOutState {
  [key: string]: any;
}

declare module "@aeaton/react-prosemirror" {
  export class Editor extends React.Component<OptOutProps, OptOutState> {}
  export class Floater extends React.Component<OptOutProps, OptOutState> {}
  export class MenuBar extends React.Component<OptOutProps, OptOutState> {}
}

declare module "@aeaton/react-prosemirror-config-default" {
  export const options: { plugins: any; schema: any };
  export const menu: any;
  export class Editor extends React.Component<OptOutProps, OptOutState> {}
  export class Floater extends React.Component<OptOutProps, OptOutState> {}
  export class MenuBar extends React.Component<OptOutProps, OptOutState> {}
}

declare module "prosemirror-state" {
  export class EditorState {
    static create(opts: any): any;
  }
}

declare module "prosemirror-model" {
  export class Fragment {
    constructor(nodes: any[], size: any);
    static from(nodes: any): any;
    static empty: any;
    static fromArray(nodes: any): any;
  }
  export class Schema {
    static fromJSON(spec: any): Schema;
  }
  export class Node {
    static fromJSON(schema: Schema, json: any): Node;
  }
  export class Mark {}
  export class MarkType {}
  export class Slice {}
  export class ResolvedPos {}
  export class NodeRange {}
  export class NodeType {}
  export type Attrs = { [key: string]: any };
  export class ContentMatch {}
}

declare module "*.scss";
