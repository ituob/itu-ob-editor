import { Translatable } from '@riboseinc/coulomb/localizer/types';


export interface Message {
  type: "telephone_service",
  contents: Translatable<any>,
}
