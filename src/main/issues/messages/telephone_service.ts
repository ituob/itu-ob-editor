import { Translatable } from 'renderer/app/localizer';


export interface TelephoneServiceMessage {
  type: "telephone_service",
  contents: Translatable<any>,
}
