import { ITURecVersion } from 'models/recommendations';


type ApprovalDocRef = string;
type ProceduresDocRef = string;
type RecBlock = { [code: string]: ITURecVersion };


export interface Message {
  type: "approved_recommendations",
  by?: ApprovalDocRef,
  procedures?: ProceduresDocRef,
  items: RecBlock,
}
