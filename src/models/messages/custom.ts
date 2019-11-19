import { Translatable } from 'sse/localizer/types';
import { Recommendation } from 'models/recommendations';


export interface Message {
  type: "custom",
  recommendation: Recommendation | null,
  title: Translatable<string>,
  contents: Translatable<any>,
}
