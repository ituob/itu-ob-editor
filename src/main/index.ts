// Jerry-rig globa.fetch to make Isomorphic Git work under Node
import fetch from 'node-fetch';
(global as any).fetch = fetch;

import * as fs from 'fs-extra';
import * as path from 'path';
import * as moment from 'moment';

import { app, Menu, ipcMain } from 'electron';
import * as log from 'electron-log';

import { WindowOpenerParams, openWindow, windows, notifyAllWindows } from 'sse/main/window';
import { listen, makeWindowEndpoint } from 'sse/api/main';
import { SettingManager } from 'sse/settings/main';
import { QuerySet, sortIntegerAscending } from 'sse/storage/query';
import { initRepo } from 'sse/storage/main/git/controller';
import { IDTakenError, CommitError } from 'sse/storage/main/store/base';
import { provideAll, provideModified, listenToBatchCommits, listenToBatchDiscardRequests } from 'sse/storage/main/api';

import { OBIssue, ScheduledIssue } from 'models/issues';

import { buildAppMenu } from './menu';
import { getStorage, MainStorage } from 'storage/main';


// Ensure only one instance of the app can run at a time on given user’s machine
if (!app.requestSingleInstanceLock()) { app.exit(0); }

// Disable GPU (?)
app.disableHardwareAcceleration();

// Catch unhandled errors in electron-log
log.catchErrors({ showDialog: true });


// Proceed with app launch sequence

const isMacOS = process.platform === 'darwin';
const isDevelopment = process.env.NODE_ENV !== 'production';


const APP_TITLE = "ITU OB editor";

let APP_HELP_ROOT: string;
if (!isDevelopment) {
  APP_HELP_ROOT = "https://www.ituob.org/_app_help/";
} else {
  APP_HELP_ROOT = "http://ituob.org:5001/_app_help/";
}


// All app-specific data
const APP_DATA = app.getPath('userData');

// Git repository contents—our database
const WORK_DIR = path.join(APP_DATA, 'itu-ob-data');

const UPSTREAM_REPO_URL = 'https://github.com/ituob/itu-ob-data';
const CORS_PROXY_URL = 'https://cors.isomorphic-git.org';


// const WELCOME_SCREEN_WINDOW_OPTS: WindowOpenerParams = {
//   component: 'welcomeConfig',
//   title: 'Welcome',
//   componentParams: `defaultRepoUrl=${UPSTREAM_REPO_URL || ''}`,
//   dimensions: { width: 800, height: 600, minWidth: 600, minHeight: 600 },
//   frameless: true,
// };

const CONFIG_WINDOW_OPTS: WindowOpenerParams = {
  component: 'dataSynchronizer',
  title: 'Settings',
  componentParams: `defaultRepoUrl=${UPSTREAM_REPO_URL || ''}`,
  dimensions: { width: 800, minWidth: 600, maxWidth: 1000, height: 450, minHeight: 400, maxHeight: 400 },
};

const HOME_WINDOW_OPTS: WindowOpenerParams = {
  component: 'home',
  title: 'ITU OB Editor',
  frameless: true,
  dimensions: { width: 800, height: 500, minWidth: 800, minHeight: 500 },
};

const HELP_WINDOW_OPTS: WindowOpenerParams = {
  title: `${APP_TITLE} Help`,
  url: APP_HELP_ROOT,
  dimensions: { width: 1100, height: 850, minWidth: 550, minHeight: 450 },
}


/* On macOS, it is common to not quit when all windows are closed,
   and recreate main window after app is activated. */

function maybeOpenHome() {
  if (app.isReady()) {
    if (windows.length < 1) {
      log.verbose("Opening home screen (no windows open yet)");
      openHomeWindow();
    }
  }
}

function maybeQuit() {
  if (!isMacOS) {
    log.verbose("Quitting (not macOS)");
    app.quit();
  }
}

function cleanUpListeners() {
  log.verbose("Cleaning up app event listeners");
  app.removeListener('activate', maybeOpenHome);
  app.removeListener('window-all-closed', maybeQuit);
  app.removeListener('quit', cleanUpListeners);
}

app.on('activate', maybeOpenHome);
app.on('window-all-closed', maybeQuit);
app.on('quit', cleanUpListeners);


const SETTINGS_PATH = path.join(APP_DATA, 'itu-ob-settings.yaml');
const settings = new SettingManager(SETTINGS_PATH);
settings.setUpAPIEndpoints();


app.whenReady().

then(() => {
  // Stage 1: Set up main settings screen,
  // and request from the user to configure repository URL if needed
  log.verbose("App launch: stage 1");

  ipcMain.on('clear-app-data', async (event: any) => {
    log.warn("App: Clearing app data!");

    log.debug(`App: Deleting ${APP_DATA}`);
    await fs.remove(APP_DATA);

    log.debug("App: Setting relaunch flag");
    app.relaunch();

    log.debug("App: Quitting");
    app.quit();
  });

  ipcMain.on('launch-devtools', async (event: any) => {
    log.info("App: received launch-devtools request");

    for (const window of windows) {
      if (window !== null) {
        window.webContents.openDevTools();
      }
    }
  });

  makeWindowEndpoint('settings', () => CONFIG_WINDOW_OPTS);

  return initRepo(
    WORK_DIR,
    UPSTREAM_REPO_URL,
    CORS_PROXY_URL,
    false,
    settings, {
      ...CONFIG_WINDOW_OPTS,
      componentParams: `${CONFIG_WINDOW_OPTS.componentParams}&inPreLaunchSetup=1`,
    },
  );
}).

then(gitCtrl => {
  // Stage 2: Set up API endpoints and notify main app screen that launch was successful
  log.verbose("App launch: stage 4");

  openHomeWindow();
  const storage: MainStorage = getStorage(gitCtrl);

  if (isMacOS) {
    // Set up app menu
    Menu.setApplicationMenu(buildAppMenu({
      getFileMenuItems: () => ([
        {
          label: "Open main window",
          click: async () => await openWindow(HOME_WINDOW_OPTS),
        },
      ]),
      getHelpMenuItems: () => ([
        {
          label: "How to use ITU OB Editor?",
          click: async () => { await openHelpWindow() },
        },
        {
          label: "Data migration guide",
          click: async () => { await openHelpWindow('migration/', { title: "Data migration guide" }) },
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

  gitCtrl.setUpAPIEndpoints();


  // When we hear any of these events, sync remote storage.
  // In addition to that, it will also get called in object update handlers below.
  ipcMain.on('remote-storage-trigger-sync', gitCtrl.synchronize);
  ipcMain.on('remote-storage-trigger-uncommitted-check', gitCtrl.checkUncommitted);


  /* Storage endpoints */

  provideAll(storage, 'issues');
  provideAll(storage, 'publications');
  provideAll(storage, 'recommendations');

  provideModified(storage, 'issues');
  provideModified(storage, 'publications');
  provideModified(storage, 'recommendations');

  listenToBatchCommits(storage, 'issues');
  listenToBatchCommits(storage, 'publications');
  listenToBatchCommits(storage, 'recommendations');

  listenToBatchDiscardRequests(storage, 'issues');
  listenToBatchDiscardRequests(storage, 'publications');
  listenToBatchDiscardRequests(storage, 'recommendations');


  /* Home screen */

  listen<{}, { id: number | null }>('current-issue-id', async () => {
    const issues = new QuerySet<OBIssue>(await storage.issues.getIndex());
    const currentIssue: OBIssue | null = issues.filter(item => {
      return new Date(item[1].publication_date).getTime() >= new Date().getTime();
    }).orderBy(sortIntegerAscending).all()[0] || null;
    return currentIssue ? { id: currentIssue.id } : { id: null };
  });


  /* Issue scheduler */

  listen<{ month: Date | null }, ScheduledIssue[]>
  ('ob-schedule', async ({ month }) => {
    const issues = new QuerySet<OBIssue>(await storage.issues.getIndex());
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

  listen<{ newData: ScheduledIssue }, { success: true }>
  ('ob-schedule-add', async ({ newData }) => {
    try {
      await storage.issues.schedule(newData);
    } catch (e) {
      if (e instanceof IDTakenError) {
        throw new Error(`OB ${newData.id} already exists. If you want to reschedule, please edit it instead.`);
      } else if (e instanceof CommitError) {
        log.error(e.code, e.message, e.stack);
        throw new Error(`Couldn’t commit the newly scheduled issue: ${e.code}`);
      } else {
        log.error(e.message, e.stack);
        throw new Error("Got unexpected error while scheduling new issue");
      }
    }
    return { success: true };
  });


  /* Issue editor */

  listen<{ issueId: number }, OBIssue>
  ('issue', async ({ issueId }) => {
    const issue: OBIssue = await storage.issues.read(issueId);
    if (!(issue.general || {}).messages) {
      issue.general = { messages: [] };
    }
    if (!(issue.amendments || {}).messages) {
      issue.amendments = { messages: [] };
    }
    return issue;
  });

  listen<{ issueId: number, data: OBIssue, commit: boolean }, { modified: boolean }>
  ('issue-update', async ({ issueId, data, commit }) => {
    await storage.issues.update(issueId, data, commit);
    return { modified: (await storage.issues.listUncommitted()).indexOf(issueId) >= 0 };
  });


  /* Set up window-opening endpoints */

  makeWindowEndpoint('publication-editor', ({ pubId }: { pubId: string }) => ({
    component: 'publicationEditor',
    title: `Publication ${pubId}`,
    componentParams: `pubId=${pubId}`,
    frameless: true,
    dimensions: { width: 800, height: 600, },
  }));

  makeWindowEndpoint('issue-editor', ({ issueId }: { issueId: number }) => ({
    component: 'issueEditor',
    title: `Issue ${issueId}`,
    componentParams: `issueId=${issueId}`,
    frameless: true,
    dimensions: { width: 800, height: 600, minWidth: 700, minHeight: 500 },
  }));

  makeWindowEndpoint('batch-commit', () => ({
    component: 'batchCommit',
    title: 'Commit or discard changes',
    frameless: true,
    dimensions: { width: 700, height: 500 },
  }));

  makeWindowEndpoint('help', ({ path, title }: { path?: string, title?: string }) => ({
    ...HELP_WINDOW_OPTS,
    ...(title ? { title } : {}),
    url: `${APP_HELP_ROOT}${path || ''}`,
  }));

  if (windows.length < 1) {
    log.verbose("No windows loaded at app launch, maybe will quit");
    maybeQuit();
  }

  log.verbose("Message home screen that app has loaded");
  notifyAllWindows('app-loaded');

});


async function openHomeWindow() {
  return await openWindow(HOME_WINDOW_OPTS);
}


async function openHelpWindow(path?: string, opts?: any) {
  return await openWindow({
    ...HELP_WINDOW_OPTS,
    ...(opts ? opts : {}),
    ...(path ? { url: `${APP_HELP_ROOT}${path || ''}` } : {}),
  });
}
