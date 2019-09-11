import { Translatable } from 'renderer/app/localizer';


export interface SRItem {
  // Country name
  country: Translatable<string>,

  // OB edition ID
  ob: number,

  // Page in that OB edition
  page: number,
}


export interface ServiceRestrictionsMessage {
  type: "service_restrictions",
  items: SRItem[],
}
