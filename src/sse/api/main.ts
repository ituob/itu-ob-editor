import { ipcMain } from 'electron';
import { openWindow } from 'sse/main/window';

import { reviveJsonValue } from './utils';


type Saver<T> = (newObj: T) => Promise<void>;
type Fetcher<T> = (params: any) => Promise<T>;

export function makeEndpoint<T>(name: string, fetcher: Fetcher<T>, saver?: Saver<{ newData: T, notify?: string[] }>) {
  ipcMain.on(`request-workspace-${name}`, async (evt: any, params?: string, newObj?: string) => {
    const parsedParams: any = JSON.parse(params || '{}', reviveJsonValue);
    if (saver && newObj) { await saver(JSON.parse(newObj, reviveJsonValue)); }
    evt.reply(`workspace-${name}`, JSON.stringify(await fetcher(parsedParams)));
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
