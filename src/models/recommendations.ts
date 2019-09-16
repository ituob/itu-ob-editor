import { IndexableObject } from 'sse/storage/query';
import { Translatable } from 'sse/localizer/types';


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
