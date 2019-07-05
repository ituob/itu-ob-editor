import * as path from 'path'
import { format as formatUrl } from 'url';
import { BrowserWindow } from 'electron';

const isDevelopment = process.env.NODE_ENV !== 'production';

export function createWindow(title: string, params: string, winParams: any) {

  const window = new BrowserWindow({
    webPreferences: {nodeIntegration: true},
    title: title,
    ...winParams
  });

  if (isDevelopment) {
    window.webContents.openDevTools();
  }

  if (isDevelopment) {
    window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}?${params}`);
  }
  else {
    window.loadURL(`${formatUrl({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file',
      slashes: true,
    })}?${params}`);
  }

  window.webContents.on('devtools-opened', () => {
    window.focus();
    setImmediate(() => {
      window.focus()
    });
  });

  return window;
}
