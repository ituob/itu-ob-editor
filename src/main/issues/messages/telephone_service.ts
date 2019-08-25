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

export interface TelephoneServiceMessage {
  type: "telephone_service",
  contents: TSCountryCommunicationSet[],
}
