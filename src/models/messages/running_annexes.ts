import { PublicationID } from 'models/publications';

export interface RunningAnnexesMessage {
  type: "running_annexes",
  extra_links: PublicationID[],
}
