import { PublicationID } from 'main/lists/models';
import { MessagePlugin } from '../base';
import { Editor } from './editor';


export interface MessageModel {
  type: "running_annexes",
  extra_links: PublicationID[],
}


export const msgType: MessagePlugin<MessageModel> = {
  getLabel: (msg) => { return {
    text: "Running Annexes",
  } },
  getEditor: () => { return Editor },
  promptTitle: "Running Annexes",
};
