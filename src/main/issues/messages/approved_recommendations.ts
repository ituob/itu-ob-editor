import { ITURecVersion } from 'main/recommendations/models';

export interface ApprovedRecommendationsMessage {
  type: "approved_recommendations",
  items: { [code: string]: ITURecVersion },
}
