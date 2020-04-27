import { Translatable } from 'coulomb/localizer/types';
import { PublicationID } from 'models/publications';


export interface AmendmentTarget {
  publication: PublicationID,

  // Date of some sort
  position_on: string | undefined,
}


export interface Message {
  type: "amendment",
  target: AmendmentTarget,
  contents: Translatable<any>,
}
