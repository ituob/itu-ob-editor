import { Translatable } from '@riboseinc/coulomb/localizer/types';
import { PublicationID } from 'models/publications';
import { Operation } from 'fast-json-patch';


export interface AmendmentTarget {
  publication: PublicationID,

  // Date of some sort
  position_on: string | undefined,
}


export interface Message {
  type: "amendment",
  target: AmendmentTarget,
  contents: Translatable<any>,
  datasetChanges?: DatasetChanges,
}

export interface DatasetChangeset {
  contents: Operation[],
}

export interface DatasetChanges {
  [datasetID: string]: DatasetChangeset,
}
