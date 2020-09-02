import { Translatable } from '@riboseinc/coulomb/localizer/types';
import { Recommendation } from 'models/recommendations';
import { DatasetMeta } from 'models/dataset';


export type PublicationID = string;


export interface Publication {
  /* Represents ITU Service Publication (SP). */

  title: Translatable<string>,
  id: PublicationID,
  url?: string,
  recommendation?: Recommendation | null,

  // TODO: Datasets are now filled in at annex level only, including meta
  datasets?: {
    [id: string]: DatasetMeta
  }
}
