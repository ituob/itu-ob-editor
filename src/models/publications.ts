import { IndexableObject } from 'sse/storage/query';
import { Translatable } from 'sse/localizer/types';

import { Recommendation } from 'models/recommendations';


export type PublicationID = string;


export interface Publication extends IndexableObject {
  title: Translatable<string>,
  id: PublicationID,
  url: string,
  recommendation: Recommendation,
}
