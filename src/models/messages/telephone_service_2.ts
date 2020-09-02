// Normalized telephone service message
// https://github.com/ituob/itu-ob-data/issues/24

import { Translatable } from '@riboseinc/coulomb/localizer/types';


export interface TSCommunication {
  date: Date,
  contents: Translatable<any>,
}


export interface TSCountryCommunicationSet {
  country_name: Translatable<string>,
  phone_code: string,
  communications: TSCommunication[],
  contact: Translatable<string>,
}


export interface Message {
  type: 'telephone_service_2',
  contents: TSCountryCommunicationSet[],
}
