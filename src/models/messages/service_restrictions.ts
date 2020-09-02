import { Translatable } from '@riboseinc/coulomb/localizer/types';


export interface SRItem {
  // Country name
  country: Translatable<string>,

  // OB edition ID
  ob: number,

  // Page in that OB edition
  page: number,
}


export interface Message {
  type: 'service_restrictions',
  items: SRItem[],
}
