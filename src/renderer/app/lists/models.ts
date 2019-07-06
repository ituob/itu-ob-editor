import { Translatable } from 'renderer/app/localizer';
import { Recommendation } from 'renderer/app/recommendations/models';


export interface Publication {
  title: Translatable,
  id: string,
  url: string,
  recommendation: Recommendation,
}

