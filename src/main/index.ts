import { app, Menu, ipcMain, BrowserWindow } from 'electron';
import { createWindow } from './window';
import { getMenu } from './menu';
import { initStorage, Workspace, Storage } from './storage';
import { reviveJsonValue } from './storage/api';
import { QuerySet, sortIntegerAscending, sortIntegerDescending } from './storage/query';
import { OBIssue } from './issues/models';


// Keeps track of windows and ensures (?) they do not get garbage collected
var windows: BrowserWindow[] = [];

var schedulerWindow: BrowserWindow | null = null;
var homeWindow: BrowserWindow | null = null;
var issueEditorsOpen: { [id: string]: BrowserWindow | null } = {};


// Ensure only one instance of the app can run at a time on given user’s machine
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) { app.exit(0); }


function makeReadableWSEndpoint<T>(name: string, dataGetter: (...args: string[]) => T): void {
  ipcMain.on(`request-workspace-${name}`, (evt: any, ...args: string[]) => {
    evt.reply(`workspace-${name}`, JSON.stringify(dataGetter(...args)));
  });
}


function makeWritableWSEndpoint(name: string, dataSaver: (...args: string[]) => void): void {
  ipcMain.on(`store-workspace-${name}`, (evt: any, ...args: string[]) => {
    dataSaver(...args);
  });
}


Promise.all([ initStorage(), app.whenReady() ]).then((...args) => {
  const storage: Storage = args[0][0];

  openHomeScreen();

  makeReadableWSEndpoint<Workspace>('all', () => {
    return storage.workspace;
  });

  makeReadableWSEndpoint<OBIssue[]>('latest-published-issues', () => {
    const issues = new QuerySet<OBIssue>(storage.workspace.issues);
    return issues.filter((item) => {
      return new Date(item[1].publication_date).getTime() < new Date().getTime();
    }).orderBy(sortIntegerDescending).all().slice(0, 1);
  });

  makeReadableWSEndpoint<OBIssue[]>('future-issues', () => {
    const issues = new QuerySet<OBIssue>(storage.workspace.issues);
    return issues.filter(item => {
      return new Date(item[1].publication_date).getTime() >= new Date().getTime();
    }).orderBy(sortIntegerAscending).all()
  });

  makeWritableWSEndpoint('future-issues', (rawData: string) => {
    const issues = JSON.parse(rawData, JSON.parse(rawData, reviveJsonValue));

    storage.workspace.issues = issues;
    storage.storeWorkspace(storage.workspace);
  });

  makeReadableWSEndpoint<OBIssue>('issue', (issueId: string) => {
    const issues = new QuerySet<OBIssue>(storage.workspace.issues);
    const issue = issues.get(issueId);

    if (!(issue.general || {}).messages) {
      issue.general = { messages: [] };
    }
    if (!(issue.amendments || {}).messages) {
      issue.amendments = { messages: [] };
    }
    return issue;
  });

  makeWritableWSEndpoint('issue', (issueId: string, rawData: string) => {
    const issueData = JSON.parse(rawData, JSON.parse(rawData, reviveJsonValue));
    storage.workspace.issues[issueId] = issueData;
    storage.storeWorkspace(storage.workspace);
  });

  Menu.setApplicationMenu(getMenu({
    openIssueScheduler,
    openHomeScreen,
  }));

  ipcMain.on('schedule-issues', (event: any) => {
    openIssueScheduler();
  });

  ipcMain.on('scheduled-new-issue', (event: any) => {
    if (homeWindow !== null) {
      homeWindow.webContents.send('update-current-issue');
    }
  });

  ipcMain.on('edit-issue', (event: any, issueId: string) => {
    openIssueEditor(issueId);
  });

  // Quit application when all windows are closed
  app.on('window-all-closed', () => {
    // On macOS it is common for applications to stay open until the user explicitly quits
    if (process.platform !== 'darwin') {
      app.quit()
    }
  });

  app.on('activate', () => {
    // On macOS it is common to re-create a window even after all windows have been closed
    if (windows.length < 1) {
      openHomeScreen();
    }
  });
});


function openHomeScreen() {
  if (homeWindow === null) {
    homeWindow = _createWindow({
      component: 'home',
      title: "ITU OB editor",
      dimensions: { width: 400, height: 400, },
      frameless: true,
    });
    homeWindow.on('close', () => {
      homeWindow = null;
    });
  } else {
    homeWindow.focus();
  }
}

function openIssueScheduler() {
  if (schedulerWindow === null) {
    schedulerWindow = _createWindow({
      component: 'issueScheduler',
      title: 'Issue Scheduler',
      frameless: true,
      dimensions: { width: 400, minWidth: 380, },
    });
    schedulerWindow.on('close', () => {
      schedulerWindow = null;
    });
  } else {
    schedulerWindow.focus();
  }
}

function openIssueEditor(issueId: string) {
  if (!issueEditorsOpen[issueId]) {
    issueEditorsOpen[issueId] = _createWindow({
      component: 'issueEditor',
      title: `Issue ${issueId}`,
      componentParams: `issueId=${issueId}`,
      frameless: true,
      dimensions: { width: 800, height: 600, },
    });
    (issueEditorsOpen[issueId] as BrowserWindow).on('close', () => {
      issueEditorsOpen[issueId] = null;
    });
  } else {
    (issueEditorsOpen[issueId] as BrowserWindow).focus();
  }
}


interface WindowMakerParams {
  title: string,
  component: string,
  componentParams?: string,
  dimensions?: { minWidth?: number, width?: number, height?: number },
  frameless?: boolean,
  winParams?: any,
}
type WindowMaker = (props: WindowMakerParams) => BrowserWindow;
const _createWindow: WindowMaker = ({ title, component, componentParams, dimensions, frameless, winParams }) => {
  const _framelessOpts = {
    frame: process.platform === 'darwin' ? true : false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
  };
  const _winParams = {
    width: (dimensions || {}).width,
    height: (dimensions || {}).height,
    ...(frameless === true ? _framelessOpts : {}),
    ...winParams,
  };
  const params = `c=${component}&${componentParams ? componentParams : ''}`;
  const window = createWindow(title, params, _winParams);

  windows.push(window);

  window.on('closed', () => {
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
  });

  return window;
}


export function _createWindowOld(id: string, title: string, params: string, winParams: any): BrowserWindow {
  const window = createWindow(title, params, winParams);

  windows.push(window);

  window.on('closed', () => {
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
  });

  return window;
}
