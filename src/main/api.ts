import { ipcMain } from 'electron';
import { openWindow } from './window';


export function makeEndpoint<T>(name: string, handler: (...args: string[]) => Promise<T>): void {
  ipcMain.on(`request-workspace-${name}`, async (evt: any, ...args: string[]) => {
    evt.reply(`workspace-${name}`, JSON.stringify(await handler(...args)));
  });
}


export function makeWriteOnlyEndpoint(name: string, dataSaver: (...args: string[]) => void): void {
  ipcMain.on(`store-workspace-${name}`, (evt: any, ...args: string[]) => {
    dataSaver(...args);
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
