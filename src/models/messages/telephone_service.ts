import { Translatable } from 'coulomb/localizer/types';


export interface Message {
  type: "telephone_service",
  contents: Translatable<any>,
}
