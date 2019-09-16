import { Translatable } from 'sse/localizer/types';


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
