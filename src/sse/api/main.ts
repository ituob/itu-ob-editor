import { ipcMain } from 'electron';
import { openWindow } from 'sse/main/window';

import { reviveJsonValue } from './utils';


export function makeEndpoint<T>(name: string, handler: (...args: any[]) => Promise<T>): void {
  ipcMain.on(`request-workspace-${name}`, async (evt: any, ...args: string[]) => {
    const parsedArgs: any[] = args.map(val => JSON.parse(val, reviveJsonValue));
    evt.reply(`workspace-${name}`, JSON.stringify(await handler(...parsedArgs)));
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
