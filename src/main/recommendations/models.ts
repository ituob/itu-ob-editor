import { IndexableObject } from 'main/storage/query';
import { Translatable } from 'renderer/app/localizer';


export type ITURecCode = string;
export type ITURecVersion = string;


export interface Recommendation {
  body: string,
  code: ITURecCode,
  version: ITURecVersion,
}


export interface ITURecommendation extends IndexableObject {
  id: ITURecCode,
  version: ITURecVersion,
  title: Translatable<string>,
}
