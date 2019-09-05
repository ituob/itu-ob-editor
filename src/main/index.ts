import { app, Menu, ipcMain, BrowserWindow } from 'electron';
import { createWindow } from './window';
import { getMenu } from './menu';
import { initRepo, initStorage, GitController, Workspace, Storage } from './storage';
import { reviveJsonValue } from './storage/api';
import { QuerySet, sortIntegerAscending, sortIntegerDescending } from './storage/query';
import { OBIssue } from './issues/models';
import { makeEndpoint, makeWriteOnlyEndpoint } from './api';


/* Generic helpers, to be moved into the framework. */


// Ensure only one instance of the app can run at a time on given user’s machine
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) { app.exit(0); }


/* This window-controlling helpers may be moved out to a separate module,
   and/or encapsulated in a class,
   as long as windows don’t get accidentally garbage-collected. */

// Keeps track of windows and ensures (?) they do not get garbage collected
var windows: BrowserWindow[] = [];

// Allows to locate window ID by label
var windowsByTitle: { [title: string]: BrowserWindow } = {};

function windowIsOpen(title: string): boolean {
  return windowsByTitle[title] !== undefined;
}

// Iterate over array of windows and try accessing window ID.
// If it throws, window was closed and we remove it from the array.
// Supposed to be run after any window is closed.
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

  if (windowIsOpen(title)) {
    windowsByTitle[title].focus();
    return windowsByTitle[title];
  }

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
  windowsByTitle[title] = window;
  window.on('closed', () => { delete windowsByTitle[title]; cleanUpWindows(); });

  return window;
}


/* App-specific initialization */


const APP_TITLE = "ITU OB editor";


Promise.all([ initRepo(), initStorage(), app.whenReady() ]).then((...args) => {
  const gitCtrl: GitController = args[0][0];
  const storage: Storage = args[0][1];

  openHomeScreen();

  makeEndpoint<Workspace>('all', async () => {
    return storage.workspace;
  });

  makeEndpoint<{ name?: string, email?: string }>('git-author-info', async () => {
    return (await gitCtrl.getAuthor());
  });

  makeEndpoint<{ errors: string[] }>('fetch-commit-push', async (
      commitMsg: string,
      authorName: string,
      authorEmail: string) => {
    try {
      await gitCtrl.pull();
      await gitCtrl.setAuthor({ name: authorName, email: authorEmail });
      await gitCtrl.commit(commitMsg);
      await gitCtrl.push();
    } catch (e) {
      return { errors: [e.toString()] };
    }
    return { errors: [] };
  });

  makeEndpoint<OBIssue[]>('latest-published-issues', async () => {
    const issues = new QuerySet<OBIssue>(storage.workspace.issues);
    return issues.filter((item) => {
      return new Date(item[1].publication_date).getTime() < new Date().getTime();
    }).orderBy(sortIntegerDescending).all().slice(0, 1);
  });

  makeEndpoint<OBIssue[]>('future-issues', async () => {
    const issues = new QuerySet<OBIssue>(storage.workspace.issues);
    return issues.filter(item => {
      return new Date(item[1].publication_date).getTime() >= new Date().getTime();
    }).orderBy(sortIntegerAscending).all()
  });

  makeWriteOnlyEndpoint('future-issues', (rawData: string) => {
    const issues = JSON.parse(rawData, JSON.parse(rawData, reviveJsonValue));

    storage.workspace.issues = issues;
    storage.storeWorkspace(storage.workspace);
  });

  makeEndpoint<OBIssue>('issue', async (issueId: string) => {
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

  makeWriteOnlyEndpoint('issue', (issueId: string, rawData: string) => {
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
    if (windowsByTitle[APP_TITLE]) {
      windowsByTitle[APP_TITLE].webContents.send('update-current-issue');
    }
  });

  ipcMain.on('edit-issue', (event: any, issueId: string) => {
    openIssueEditor(issueId);
  });

  ipcMain.on('sync-changes', (event: any) => {
    openDataSynchronizer();
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
  _createWindow({
    component: 'home',
    title: APP_TITLE,
    dimensions: { width: 400, height: 400, },
    frameless: true,
  });
}

function openIssueScheduler() {
  _createWindow({
    component: 'issueScheduler',
    title: 'Issue Scheduler',
    frameless: true,
    dimensions: { width: 400, minWidth: 380, },
  });
}

function openDataSynchronizer() {
  _createWindow({
    component: 'dataSynchronizer',
    title: 'Data Synchronizer',
    dimensions: { width: 400, minWidth: 380, height: 400 },
  });
}

function openIssueEditor(issueId: string) {
  _createWindow({
    component: 'issueEditor',
    title: `Issue ${issueId}`,
    componentParams: `issueId=${issueId}`,
    frameless: true,
    dimensions: { width: 800, height: 600, },
  });
}
