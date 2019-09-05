import * as path from 'path';

import { app, Menu, ipcMain } from 'electron';

import { getMenu } from './menu';
import { makeEndpoint, makeWriteOnlyEndpoint } from './api';
import { openWindow, getWindowByTitle, windows } from './window';
import { initStorage, Workspace, Storage } from './storage';
import { initRepo, GitController } from './storage/git';

import { reviveJsonValue } from './storage/api';
import { QuerySet, sortIntegerAscending, sortIntegerDescending } from './storage/query';
import { OBIssue } from './issues/models';


const APP_TITLE = "ITU OB editor";


const WORK_DIR = path.join(app.getPath('userData'), 'itu-ob-data');
const REPO_URL = 'https://github.com/ituob/itu-ob-data';
const CORS_PROXY_URL = 'https://cors.isomorphic-git.org';


// Ensure only one instance of the app can run at a time on given user’s machine
if (!app.requestSingleInstanceLock()) { app.exit(0); }


Promise.all([
  initRepo(WORK_DIR, REPO_URL, CORS_PROXY_URL),
  initStorage(WORK_DIR),
  app.whenReady(),
]).then((...args) => {

  const gitCtrl: GitController = args[0][0];
  const storage: Storage = args[0][1];

  // Open home screen
  openHomeScreen();

  // Quit application when all windows are closed
  app.on('window-all-closed', () => {
    // On macOS it is common for applications to stay open until the user explicitly quits
    if (process.platform !== 'darwin') {
      app.quit()
    }
  });

  // Reopen home window on app reactivation
  app.on('activate', () => {
    // On macOS it is common to re-create a window even after all windows have been closed
    if (windows.length < 1) {
      openHomeScreen();
    }
  });


  // Set up app menu
  Menu.setApplicationMenu(getMenu({
    openIssueScheduler,
    openHomeScreen,
  }));


  /* Set up endpoints */

  makeEndpoint<Workspace>('all', async () => {
    return storage.workspace;
  });

  makeEndpoint<{ name?: string, email?: string }>('git-author-info', async () => {
    return (await gitCtrl.getAuthor());
  });

  makeEndpoint<{ errors: string[] }>('fetch-commit-push', async (
      commitMsg: string,
      authorName: string,
      authorEmail: string,
      gitUsername: string,
      gitPassword: string) => {
    try {
      await gitCtrl.pull();
      await gitCtrl.setAuthor({ name: authorName, email: authorEmail });
      await gitCtrl.setAuth({ username: gitUsername, password: gitPassword });
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

  // TODO: Refactor into schedule-issue and do it one at a time?
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


  /* Set up window-opening endpoints */

  ipcMain.on('schedule-issues', (event: any) => {
    openIssueScheduler();
  });

  ipcMain.on('scheduled-new-issue', (event: any) => {
    const homeWindow = getWindowByTitle(APP_TITLE);
    if (homeWindow !== undefined) {
      homeWindow.webContents.send('update-current-issue');
    }
  });

  ipcMain.on('edit-issue', (event: any, issueId: string) => {
    openIssueEditor(issueId);
  });

  ipcMain.on('sync-changes', (event: any) => {
    openDataSynchronizer();
  });

});


/* App-specific window-opening helpers */

function openHomeScreen() {
  openWindow({
    component: 'home',
    title: APP_TITLE,
    dimensions: { width: 400, height: 400, },
    frameless: true,
  });
}

function openIssueScheduler() {
  openWindow({
    component: 'issueScheduler',
    title: 'Issue Scheduler',
    frameless: true,
    dimensions: { width: 400, minWidth: 380, },
  });
}

function openDataSynchronizer() {
  openWindow({
    component: 'dataSynchronizer',
    title: 'Data Synchronizer',
    dimensions: { width: 800, minWidth: 600, height: 550 },
  });
}

function openIssueEditor(issueId: string) {
  openWindow({
    component: 'issueEditor',
    title: `Issue ${issueId}`,
    componentParams: `issueId=${issueId}`,
    frameless: true,
    dimensions: { width: 800, height: 600, },
  });
}
