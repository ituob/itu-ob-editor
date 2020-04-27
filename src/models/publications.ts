import { Translatable } from 'coulomb/localizer/types';

import { Recommendation } from 'models/recommendations';


export type PublicationID = string;


export interface Publication {
  /* Represents ITU Service Publication (SP). */

  title: Translatable<string>,
  id: PublicationID,
  url?: string,
  recommendation?: Recommendation | null,
}
