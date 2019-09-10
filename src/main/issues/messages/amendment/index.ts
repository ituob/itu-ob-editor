import { PublicationID } from 'main/lists/models';
import { MessagePlugin } from '../base';

import { Editor } from './editor';


export interface AmendmentTarget {
  publication: PublicationID,
  position_on: string | undefined,
}

export interface MessageModel {
  type: "amendment",
  target: AmendmentTarget,
  contents: any,
}


export const msgType: MessagePlugin<MessageModel> = {
  getLabel: (msg) => { return {
    text: "Amendment",
    suffix: `to ${((msg as MessageModel).target || {}).publication}`,
  } },
  getEditor: () => { return Editor },
  promptTitle: "Amendment",
};
