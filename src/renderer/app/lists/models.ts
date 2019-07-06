import { Translatable } from 'renderer/app/localizer';
import { Recommendation } from 'renderer/app/recommendations/models';


export type PublicationID = string;

export interface Publication {
  title: Translatable,
  id: PublicationID,
  url: string,
  recommendation: Recommendation,
}
