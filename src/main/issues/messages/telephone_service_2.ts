// Normalized telephone service message
// https://github.com/ituob/itu-ob-data/issues/24

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

export interface TelephoneServiceMessageV2 {
  type: "telephone_service_2",
  contents: TSCountryCommunicationSet[],
}
