import { ITURecVersion } from 'main/recommendations/models';
import { MessagePlugin } from '../base';
import { Editor } from './editor';


export interface MessageModel {
  type: "approved_recommendations",
  items: { [code: string]: ITURecVersion },
}


export const msgType: MessagePlugin<MessageModel> = {
  getLabel: (msg) => { return {
    text: "Approved Recommendations",
  } },
  getEditor: () => { return Editor },
  promptTitle: "Approved Recommendations",
};
