import { Translatable } from 'renderer/app/localizer';
import { PublicationID } from 'main/lists/models';


export interface AmendmentTarget {
  publication: PublicationID,
  position_on: string | undefined,
}


export interface AmendmentMessage {
  type: "amendment",
  target: AmendmentTarget,
  contents: Translatable<any>,
}
