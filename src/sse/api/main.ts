import { ipcMain } from 'electron';
import { openWindow } from 'sse/main/window';

import { reviveJsonValue } from './utils';


type Saver<I> = (input: I) => Promise<void>;
type Fetcher<O> = (params: any) => Promise<O>;

export function makeEndpoint<T>(name: string, fetcher: Fetcher<T>, saver?: Saver<{ newData: T, notify?: string[] }>) {
  ipcMain.on(`request-workspace-${name}`, async (evt: any, params?: string, newObj?: string) => {
    // TODO: Electron should be handling JSON [de]serialization for us, refactor!
    const parsedParams: any = JSON.parse(params || '{}', reviveJsonValue);
    let result: any;

    if (saver && newObj) {
      await saver(JSON.parse(newObj, reviveJsonValue));
    }

    if (fetcher) {
      result = await fetcher(parsedParams);
    } else {
      result = { success: true };
    }

    evt.reply(`workspace-${name}`, JSON.stringify(result));
  });
}


export function makeWriteOnlyEndpoint(name: string, dataSaver: (...args: any[]) => void): void {
  ipcMain.on(`store-workspace-${name}`, (evt: any, ...args: string[]) => {
    const parsedArgs: any[] = args.map(val => JSON.parse(val, reviveJsonValue));
    dataSaver(...parsedArgs);
  });
}


export function makeWindowEndpoint(name: string, getWindowOpts: (...args: string[]) => any): void {
  ipcMain.on(`open-${name}`, async (evt: any, ...args: string[]) => {
    await openWindow(getWindowOpts(...args));

    const result = JSON.stringify({ errors: [] });
    evt.returnValue = result;
    evt.reply(`open-${name}-done`, result);
  });
}
