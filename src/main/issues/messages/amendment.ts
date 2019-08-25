import { PublicationID } from 'main/lists/models';

export interface AmendmentTarget {
  publication: PublicationID,
  position_on: string | undefined,
}

export interface AmendmentMessage {
  type: "amendment",
  target: AmendmentTarget,
  contents: any,
}
