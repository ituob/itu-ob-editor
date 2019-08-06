import { Recommendation } from 'main/recommendations/models';
import { Translatable } from 'renderer/app/localizer';


export type PublicationID = string;

export interface Publication {
  title: Translatable,
  id: PublicationID,
  url: string,
  recommendation: Recommendation,
}
