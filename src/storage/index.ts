import { Storage as BaseStorage } from 'sse/storage';

import { OBIssue } from 'models/issues';
import { ITURecommendation } from 'models/recommendations';
import { Publication } from 'models/publications';


export interface Storage extends BaseStorage {
  publications: Publication,
  issues: OBIssue,
  recommendations: ITURecommendation,
}
