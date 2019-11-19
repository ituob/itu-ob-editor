import { PublicationID } from 'models/publications';

export interface Message {
  type: "running_annexes",
  extra_links: PublicationID[],
}
