interface ServiceRestrictionsItem {
  // Country name
  country: string,

  // OB edition ID
  ob: number,

  // Page in that OB edition
  page: number,
}

export interface ServiceRestrictionsMessage {
  type: "service_restrictions",
  items: ServiceRestrictionsItem[],
}
