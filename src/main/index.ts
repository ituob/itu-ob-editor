import * as path from 'path';
import * as moment from 'moment';

import { app, Menu, ipcMain } from 'electron';

import { WindowOpenerParams, openWindow, getWindowByTitle, getWindow, windows } from 'sse/main/window';
import { makeEndpoint, makeWriteOnlyEndpoint, makeWindowEndpoint } from 'sse/api/main';
import { manager as settings } from 'sse/settings/main';
import { QuerySet, sortIntegerAscending } from 'sse/storage/query';
import { Index } from 'sse/storage/query';
import { setRepoUrl, initRepo } from 'sse/storage/main/git-controller';

import { OBIssue, ScheduledIssue } from 'models/issues';

import { getMenu } from './menu';
import { initStorage, Workspace } from './storage';


const APP_TITLE = "ITU OB editor";


const WORK_DIR = path.join(app.getPath('userData'), 'itu-ob-data');
const DEFAULT_REPO_URL = 'https://github.com/ituob/itu-ob-data';
const CORS_PROXY_URL = 'https://cors.isomorphic-git.org';


const WELCOME_SCREEN_WINDOW_OPTS: WindowOpenerParams = {
  component: 'welcomeConfig',
  title: 'Welcome',
  componentParams: `defaultRepoUrl=${DEFAULT_REPO_URL || ''}`,
  dimensions: { width: 800, height: 600, minWidth: 600, minHeight: 600 },
  frameless: true,
};

const ISSUE_SCHEDULER_WINDOW_OPTS: WindowOpenerParams = {
  component: 'issueScheduler',
  title: 'OB schedule',
  frameless: true,
  dimensions: { width: 600, height: 500, minWidth: 600, minHeight: 400 },
};


// Ensure only one instance of the app can run at a time on given user’s machine
if (!app.requestSingleInstanceLock()) { app.exit(0); }


settings.setUpAPIEndpoints();


// Quit application when all windows are closed
app.on('window-all-closed', () => {
  // On macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


app.whenReady().
then(() => setRepoUrl(WELCOME_SCREEN_WINDOW_OPTS)).
then(repoUrl => initRepo(WORK_DIR, repoUrl || DEFAULT_REPO_URL, CORS_PROXY_URL)).
then(gitCtrl => {
  initStorage(WORK_DIR).then(storage => {

    // Open home screen
    openHomeScreen();

    // Reopen home window on app reactivation
    app.on('activate', () => {
      // On macOS it is common to re-create a window even after all windows have been closed
      if (windows.length < 1) {
        openHomeScreen();
      }
    });

    // Set up app menu
    Menu.setApplicationMenu(getMenu({
      openIssueScheduler: async () => await openWindow(ISSUE_SCHEDULER_WINDOW_OPTS),
      openHomeScreen,
    }));


    /* Set up endpoints */

    // TODO: Implement time travel (undo/redo) via main API endpoints.
    // Store whole workspace in one timeline, or have per-index / per-object timelines
    // and reconcile them somehow;
    // possibly record timeline states into a temporary file;
    // allow dispatching reducer actions through API endpoints (including types UNDO/REDO).

    storage.setUpAPIEndpoints((notify: string[]) => {
      if (notify.indexOf('publications') >= 0) {
        const issueEditor = getWindow(win => win.getTitle().indexOf('Issue ') === 0);
        if (issueEditor) {
          issueEditor.webContents.send('publications-changed');
        }
      }
    });

    gitCtrl.setUpAPIEndpoints();

    makeEndpoint<Index<any>>('storage-search', async ({ query }: { query?: string }) => {
      return await storage.findObjects(query);
    });

    makeEndpoint<Workspace>('all', async () => {
      return storage.workspace;
    });


    /* Home screen */

    makeEndpoint<{ id: number | null }>('current-issue-id', async () => {
      const issues = new QuerySet<OBIssue>(storage.workspace.issues);
      const currentIssue: OBIssue | null = issues.filter(item => {
        return new Date(item[1].publication_date).getTime() >= new Date().getTime();
      }).orderBy(sortIntegerAscending).all()[0] || null;
      return currentIssue ? { id: currentIssue.id } : { id: null };
    });


    /* Issue scheduler */

    makeEndpoint<ScheduledIssue[]>('ob-schedule', async ({ month }: { month: Date | null}) => {
      const issues = new QuerySet<OBIssue>(storage.workspace.issues);
      return issues.orderBy(sortIntegerAscending).filter(item => {
        if (month) {
          return (
            moment(item[1].publication_date).isSame(month, 'month') ||
            moment(item[1].cutoff_date).isSame(month, 'month'));
        } else {
          return new Date(item[1].publication_date).getTime() >= new Date().getTime();
        }
      }).all().map(issue => {
        return {
          id: issue.id,
          publication_date: issue.publication_date,
          cutoff_date: issue.cutoff_date,
        };
      });
    });

    makeEndpoint<ScheduledIssue>('ob-schedule-add', async ({ issueId }: { issueId: string }) => {
      return storage.workspace.issues[issueId];
    }, async ({ newData }) => {
      const existingIssue = storage.workspace.issues[newData.id];
      storage.workspace.issues[newData.id] = Object.assign(existingIssue || {}, newData);
      await storage.storeWorkspace();
    });


    /* Issue editor */

    makeEndpoint<OBIssue>('issue', async ({ issueId }: { issueId: string }) => {
      const issues = new QuerySet<OBIssue>(storage.workspace.issues);
      const issue = issues.get(issueId);

      if (!issue) {
        throw new Error(`Issue ${issueId} not found`);
      }
      if (!(issue.general || {}).messages) {
        issue.general = { messages: [] };
      }
      if (!(issue.amendments || {}).messages) {
        issue.amendments = { messages: [] };
      }
      return issue;
    });

    makeWriteOnlyEndpoint('issue', ({ issueId }: { issueId: string }, issue: OBIssue) => {
      storage.workspace.issues[issue.id] = issue;
      storage.storeWorkspace();
    });


    /* Set up window-opening endpoints */

    makeWindowEndpoint('publication-editor', (id: string) => ({
      component: 'publicationEditor',
      title: `Publication ${id}`,
      componentParams: `pubId=${id}`,
      frameless: true,
      dimensions: { width: 800, height: 600, },
    }));

    makeWindowEndpoint('issue-scheduler', () => ISSUE_SCHEDULER_WINDOW_OPTS);

    makeWindowEndpoint('issue-editor', (issueId: string) => ({
      component: 'issueEditor',
      title: `Issue ${issueId}`,
      componentParams: `issueId=${issueId}`,
      frameless: true,
      dimensions: { width: 800, height: 600, minWidth: 700, minHeight: 500 },
    }));

    ipcMain.on('scheduled-new-issue', (event: any) => {
      const homeWindow = getWindowByTitle(APP_TITLE);
      if (homeWindow !== undefined) {
        homeWindow.webContents.send('update-current-issue');
      }
    });

    makeWindowEndpoint('spotlight', () => ({
      component: 'spotlight',
      title: 'Spotlight',
      frameless: true,
      dimensions: { width: 800, height: 200 },
    }));

    makeWindowEndpoint('preflight', () => ({
      component: 'preflight',
      title: 'Preflight',
      dimensions: { width: 800, minWidth: 600, height: 650, minHeight: 650 },
    }));

    makeWindowEndpoint('data-synchronizer', () => ({
      component: 'dataSynchronizer',
      title: 'Merge Changes',
      dimensions: { width: 800, minWidth: 600, height: 640, minHeight: 640 },
    }));

  });
});

async function openHomeScreen() {
  return await openWindow({
    component: 'home',
    title: APP_TITLE,
    dimensions: { width: 300, height: 400, minWidth: 300, minHeight: 300 },
    frameless: true,
  });
}
