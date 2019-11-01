import * as path from 'path';
import * as moment from 'moment';

import { app, Menu, ipcMain } from 'electron';

import { WindowOpenerParams, openWindow, getWindowByTitle, getWindow, windows } from 'sse/main/window';
import { makeEndpoint, makeWriteOnlyEndpoint, makeWindowEndpoint } from 'sse/api/main';
import { SettingManager } from 'sse/settings/main';
import { QuerySet, sortIntegerAscending } from 'sse/storage/query';
import { Index } from 'sse/storage/query';
import { GitController, setRepoUrl, initRepo } from 'sse/storage/main/git-controller';

import { OBIssue, ScheduledIssue } from 'models/issues';

import { buildAppMenu } from './menu';
import { initStorage, Workspace } from './storage';


const isMacOS = process.platform === 'darwin';


const APP_TITLE = "ITU OB editor";
const APP_HELP_ROOT = "https://www.ituob.org/_app_help/";


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


app.disableHardwareAcceleration();


// Ensure only one instance of the app can run at a time on given user’s machine
if (!app.requestSingleInstanceLock()) { app.exit(0); }


const SETTINGS_PATH = path.join(WORK_DIR, 'itu-ob-settings.yaml');
const settings = new SettingManager(SETTINGS_PATH);
settings.setUpAPIEndpoints();


// Quit application when all windows are closed
app.on('window-all-closed', () => {
  // On macOS it is common for applications to stay open until the user explicitly quits
  if (!isMacOS) {
    app.quit();
  }
});


app.whenReady().
then(() => setRepoUrl(WELCOME_SCREEN_WINDOW_OPTS, settings)).
then(repoUrl => {
  return Promise.all([
    (async () => {
      await openHomeWindow();

      // Reopen home window on app reactivation
      app.on('activate', () => {
        // On macOS it is common to re-create a window even after all windows have been closed
        if (windows.length < 1) {
          openHomeWindow();
        }
      });
    })(),
    initRepo(WORK_DIR, repoUrl || DEFAULT_REPO_URL, CORS_PROXY_URL),
  ]);
}).
then(results => {
  const gitCtrl: GitController = results[1];

  initStorage(WORK_DIR).then(storage => {
    messageHome('app-loaded');

    if (isMacOS) {
      // Set up app menu
      Menu.setApplicationMenu(buildAppMenu({
        getFileMenuItems: () => ([
          {
            label: "Open Calendar",
            click: async () => await openWindow(ISSUE_SCHEDULER_WINDOW_OPTS),
          },
          {
            label: "Open Home Screen",
            click: openHomeWindow,
          },
        ]),
        getHelpMenuItems: () => ([
          {
            label: "How to use ITU OB Editor?",
            click: async () => { await openWindow({
              title: `${APP_TITLE} Help`,
              url: APP_HELP_ROOT,
              dimensions: { width: 1100, height: 650, minWidth: 550, minHeight: 450 },
            }); },
          },
          {
            label: "Data migration guide",
            click: async () => { await openWindow({
              title: `Data migration guide`,
              url: `${APP_HELP_ROOT}migration/`,
              dimensions: { width: 1100, height: 650, minWidth: 550, minHeight: 450 },
            }); },
          },
        ]),
      }));
    } else {
      Menu.setApplicationMenu(null);
    }


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
      storage.workspace.issues[newData.id] = Object.assign(existingIssue || {} as OBIssue, newData);
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
      messageHome('update-current-issue');
      event.reply('ok');
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


function messageHome(eventName: string) {
  const homeWindow = getWindowByTitle(APP_TITLE);
  if (homeWindow !== undefined) {
    homeWindow.webContents.send(eventName);
  }
}


async function openHomeWindow() {
  return await openWindow({
    component: 'home',
    title: APP_TITLE,
    dimensions: { width: 300, height: 400, minWidth: 300, minHeight: 300 },
    frameless: true,
  });
}
