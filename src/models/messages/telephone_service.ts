import { Translatable } from 'sse/localizer/types';


export interface Message {
  type: "telephone_service",
  contents: Translatable<any>,
}
