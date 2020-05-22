import { Translatable } from 'coulomb/localizer/types';
import { Recommendation } from 'models/recommendations';
import { Dataset } from 'models/dataset';


export type PublicationID = string;


export interface Publication {
  /* Represents ITU Service Publication (SP). */

  title: Translatable<string>,
  id: PublicationID,
  url?: string,
  recommendation?: Recommendation | null,

  datasets?: {
    [id: string]: Dataset
  }
}
