import { PublicationID } from 'main/lists/models';

export interface RunningAnnexesMessage {
  type: "running_annexes",
  extra_links: PublicationID[],
}
