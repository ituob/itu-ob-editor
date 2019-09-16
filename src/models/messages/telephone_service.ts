import { Translatable } from 'sse/localizer/types';


export interface TelephoneServiceMessage {
  type: "telephone_service",
  contents: Translatable<any>,
}
