import { FreeformMessage } from 'models/freeform-message';

export type Message = { type: "ipns" } & FreeformMessage;
