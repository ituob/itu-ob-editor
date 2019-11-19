import { FreeformMessage } from 'models/freeform-message';

export type Message = { type: "org_changes" } & FreeformMessage;
