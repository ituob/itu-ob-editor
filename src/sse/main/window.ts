import * as path from 'path'
import { format as formatUrl } from 'url';
import { BrowserWindow } from 'electron';


/* Window-related helpers
   TODO (#4): Move into the framework */


const isDevelopment = process.env.NODE_ENV !== 'production';

// Keeps track of windows and ensures (?) they do not get garbage collected
export var windows: BrowserWindow[] = [];

// Allows to locate window ID by label
var windowsByTitle: { [title: string]: BrowserWindow } = {};


// Open new window, or focus if one with the same title already exists
interface WindowOpenerParams {
  title: string,
  component: string,
  componentParams?: string,
  dimensions?: { minHeight?: number, minWidth?: number, width?: number, height?: number },
  frameless?: boolean,
  winParams?: any,
}
export type WindowOpener = (props: WindowOpenerParams) => Promise<BrowserWindow>;
export const openWindow: WindowOpener = async ({
    title,
    component, componentParams,
    dimensions, frameless,
    winParams}) => {

  const _existingWindow = getWindowByTitle(title);
  if (_existingWindow !== undefined) {
    _existingWindow.focus();
    return _existingWindow;
  }

  const _framelessOpts = {
    frame: process.platform === 'darwin' ? true : false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
  };

  const _winParams = {
    width: (dimensions || {}).width,
    minWidth: (dimensions || {}).minWidth,
    height: (dimensions || {}).height,
    minHeight: (dimensions || {}).minHeight,
    ...(frameless === true ? _framelessOpts : {}),
    ...winParams,
  };

  const params = `c=${component}&${componentParams ? componentParams : ''}`;
  const window = await createWindow(title, params, _winParams);

  windows.push(window);
  windowsByTitle[title] = window;
  window.on('closed', () => { delete windowsByTitle[title]; cleanUpWindows(); });

  return window;
}


export function getWindowByTitle(title: string): BrowserWindow | undefined {
  return windowsByTitle[title];
}


export function getWindow(func: (win: BrowserWindow) => boolean): BrowserWindow | undefined {
  return windows.find(func);
}


// Iterate over array of windows and try accessing window ID.
// If it throws, window was closed and we remove it from the array.
// Supposed to be run after any window is closed
function cleanUpWindows() {
  var deletedWindows: number[] = [];
  for (const [idx, win] of windows.entries()) {
    // When accessing the id attribute of a closed window,
    // it’ll throw. We’ll mark its index for deletion then.
    try {
      win.id;
    } catch (e) {
      deletedWindows.push(idx - deletedWindows.length);
    }
  }
  for (const idx of deletedWindows) {
    windows.splice(idx, 1);
  }
}


function createWindow(title: string, params: string, winParams: any): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    webPreferences: {nodeIntegration: true},
    title: title,
    show: false,
    ...winParams
  });

  const promise = new Promise<BrowserWindow>((resolve, reject) => {
    window.once('ready-to-show', () => {
      window.show();
      resolve(window);
    });
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

  return promise;
}
