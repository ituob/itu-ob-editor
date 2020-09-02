import { Translatable } from '@riboseinc/coulomb/localizer/types';


export type ITURecCode = string;
export type ITURecVersion = string;


export interface Recommendation {
  body: string,
  code: ITURecCode,
  version: ITURecVersion,
}


export interface ITURecommendation {
  id: ITURecCode,
  version: ITURecVersion,
  title: Translatable<string>,
}
