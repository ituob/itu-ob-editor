import { ipcMain } from 'electron';


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
