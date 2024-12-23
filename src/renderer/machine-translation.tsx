import AsyncLock from "async-lock";

export abstract class Translator<T> {
  async init() {}
  async destroy() {}
  abstract translate(val: T, ...opts: any[]): Promise<T>;
}

export class ITUTranslator extends Translator<string> {
  endpointPrefix: string = "wss://nmt.itu.int/marian_translate_";
  sockets: { [langPair: string]: WebSocket } = {};
  socketLocks: AsyncLock;

  constructor() {
    super();
    this.socketLocks = new AsyncLock({ timeout: 1000 });
  }

  private async getSocketForLanguage(endpoint: string): Promise<WebSocket> {
    if (this.sockets[endpoint] === undefined) {
      return new Promise((resolve, reject) => {
        const socket = new WebSocket(`${this.endpointPrefix}${endpoint}`);

        socket.onclose = () => {
          delete this.sockets[endpoint];
        };
        socket.onopen = function () {
          resolve(socket);
        };
        socket.onerror = function (err) {
          reject(err);
        };

        this.sockets[endpoint] = socket;
      });
    }
    return this.sockets[endpoint];
  }

  async translate(val: string, fromLanguage: string, toLanguage: string) {
    const pair = `${fromLanguage}${toLanguage}`;

    return await this.socketLocks.acquire(pair, async (): Promise<string> => {
      const socket = await this.getSocketForLanguage(pair);

      return new Promise((resolve, reject) => {
        socket.onmessage = function (evt: { data: string }) {
          resolve(evt.data);
        };
        socket.onerror = function (err: any) {
          reject(err);
        };
        socket.send(val);
      });
    });
  }

  async destroy() {
    for (const socket of Object.values(this.sockets)) {
      socket.close();
    }
  }
}
