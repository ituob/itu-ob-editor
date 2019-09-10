import { MessagePlugin } from '../base';
import { TelephoneServiceMessageEditor } from './editor';


export interface TSCommunication {
  date: Date,
  contents: any,
}

export interface TSCountryCommunicationSet {
  country_name: string,
  phone_code: string,
  communications: TSCommunication[],
  contact: string,
}

export interface MessageModel {
  type: "telephone_service_2",
  contents: TSCountryCommunicationSet[],
}


export const msgType: MessagePlugin<MessageModel> = {
  getLabel: (msg) => { return { text: "Telephone Service" } },
  getEditor: () => { return TelephoneServiceMessageEditor },
  promptTitle: "Telephone Service",
};
