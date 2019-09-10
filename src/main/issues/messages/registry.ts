import { MessagePlugin } from './base';


export class MessageTypeRegistry {
  messagePlugins: { [typeId: string]: MessagePlugin<any> } = {}

  register(typeId: string, plugin: MessagePlugin<any>) {
    this.messagePlugins[typeId] = plugin;
  }

  getPlugin(typeId: string): MessagePlugin<any> {
    const plugin = this.messagePlugins[typeId];

    if (plugin === undefined) {
      throw new Error(`Unknown message type: ${typeId}`);
    }

    return plugin;
  }
}
