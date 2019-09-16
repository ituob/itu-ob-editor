import { ITURecVersion } from 'models/recommendations';


export interface ApprovedRecommendationsMessage {
  type: "approved_recommendations",
  items: { [code: string]: ITURecVersion },
}
