import * as fs from 'fs-extra';
import * as path from 'path';
import * as moment from 'moment';

import { app, Menu, ipcMain } from 'electron';
import * as log from 'electron-log';

import { WindowOpenerParams, openWindow, getWindowByTitle, getWindow, windows } from 'sse/main/window';
import { listen, makeWindowEndpoint } from 'sse/api/main';
import { SettingManager } from 'sse/settings/main';
import { QuerySet, sortIntegerAscending } from 'sse/storage/query';
import { GitController, setRepoUrl, initRepo } from 'sse/storage/main/git-controller';

import { OBIssue, ScheduledIssue, OBMessageSection, issueFactories } from 'models/issues';
import { Message } from 'models/messages';

import { buildAppMenu } from './menu';
import { initStorage, Storage } from './storage';


// Ensure only one instance of the app can run at a time on given user’s machine
if (!app.requestSingleInstanceLock()) { app.exit(0); }

// Disable GPU (?)
app.disableHardwareAcceleration();

// Catch unhandled errors in electron-log
log.catchErrors({ showDialog: true });

Menu.setApplicationMenu(null);


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

  makeWindowEndpoint('settings', () => ({
    component: 'settings',
    title: 'Settings',
    dimensions: { width: 500, minWidth: 500, height: 640, minHeight: 640 },
  }));

  return setRepoUrl(WELCOME_SCREEN_WINDOW_OPTS, settings);
}).

then(({ url, hasChanged }) => {
  // Stage 2: Open home window and initialize data repository (in parallel)

  log.verbose("App launch: stage 2");
  return Promise.all([
    openHomeWindow(),
    initRepo(WORK_DIR, url || DEFAULT_REPO_URL, CORS_PROXY_URL, hasChanged),
  ]);
}).

then(results => {
  // Stage 3: Initialize storage (read data repository data)
  log.verbose("App launch: stage 3");

  const gitCtrl: GitController = results[1];

  return Promise.all([
    Promise.resolve(gitCtrl),
    initStorage(WORK_DIR),
  ]);
}).

then(results => {
  // Stage 4: Set up API endpoints and notify main app screen that launch was successful
  log.verbose("App launch: stage 4");

  const gitCtrl: GitController = results[0];
  const storage: Storage = results[1];

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


  /* Home screen */

  listen<{}, { id: number | null }>('current-issue-id', async () => {
    const issues = new QuerySet<OBIssue>(storage.workspace.issues);
    const currentIssue: OBIssue | null = issues.filter(item => {
      return new Date(item[1].publication_date).getTime() >= new Date().getTime();
    }).orderBy(sortIntegerAscending).all()[0] || null;
    return currentIssue ? { id: currentIssue.id } : { id: null };
  });


  /* Issue scheduler */

  listen<{ month: Date | null }, ScheduledIssue[]>
  ('ob-schedule', async ({ month }) => {
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

  listen<{ issueId: string, newData: ScheduledIssue }, { success: boolean }>
  ('ob-schedule-add', async ({ issueId, newData }) => {
    const existingIssue = storage.workspace.issues[newData.id];
    storage.workspace.issues[newData.id] = Object.assign(existingIssue || {} as OBIssue, newData);
    await storage.storeWorkspace();
    await messageHome('update-current-issue');
    return { success: true };
  });


  /* Issue editor */

  listen<{ issueId: string }, OBIssue>
  ('issue', async ({ issueId }) => {
    const issue: OBIssue = storage.workspace.issues[issueId];
    if (!issue) {
      throw new Error(`Requested issue ${issueId} could not be found`);
    }

    if (!(issue.general || {}).messages) {
      issue.general = { messages: [] };
    }
    if (!(issue.amendments || {}).messages) {
      issue.amendments = { messages: [] };
    }
    return issue;
  });

  listen<{ issueId: string, section: OBMessageSection, msgIdx: number }, Message>
  ('get-ob-message', async ({ issueId, section, msgIdx }) => {
    const msg: Message = (storage.workspace.issues[issueId] || {})[section].messages[msgIdx];
    if (!msg) {
      throw new Error(`Requested message ${issueId}/${section}#${msgIdx} could not be found`);
    }

    return msg;
  });

  listen<{ issueId: string, section: OBMessageSection, msgIdx: number }, { success: boolean }>
  ('remove-ob-message', async ({ issueId, section, msgIdx }) => {
    const issue: OBIssue = storage.workspace.issues[issueId];
    if (!issue) {
      throw new Error(`Requested issue ${issueId} could not be found`);
    }
    const msg: Message = issue[section].messages[msgIdx];
    if (!msg) {
      throw new Error(`Requested message ${issueId}/${section}#${msgIdx} could not be found`);
    }

    const newIssue = issueFactories.withRemovedMessage(issue, section, msgIdx);
    await storage.storeManagers.issues.store(newIssue, storage);

    return { success: true };
  });

  listen<{ issueId: string, section: OBMessageSection, msgIdx: number, msg: Message }, { success: boolean }>
  ('add-ob-message', async ({ issueId, section, msgIdx, msg }) => {
    const issue: OBIssue = storage.workspace.issues[issueId];
    if (!issue) {
      throw new Error(`Requested issue ${issueId} could not be found`);
    }

    const newIssue = issueFactories.withAddedMessage(issue, section, msgIdx, msg);
    await storage.storeManagers.issues.store(newIssue, storage);

    return { success: true };
  });

  listen<{ issueId: string, section: OBMessageSection, msgIdx: number, updatedMsg: Message }, { success: boolean }>
  ('edit-ob-message', async ({ issueId, section, msgIdx, updatedMsg }) => {
    // TODO: We need our storage to lock here (#59)

    const issue: OBIssue = storage.workspace.issues[issueId];
    if (!issue) {
      throw new Error(`Requested issue ${issueId} could not be found`);
    }
    const msg: Message = issue[section].messages[msgIdx];
    if (!msg) {
      throw new Error(`Requested message ${issueId}/${section}#${msgIdx} could not be found`);
    }

    const newIssue = issueFactories.withEditedMessage(issue, section, msgIdx, updatedMsg);
    await storage.storeManagers.issues.store(newIssue, storage);

    return { success: true };
  });


  /* Set up window-opening endpoints */

  makeWindowEndpoint('publication-editor', ({ pubId } : { pubId: string }) => ({
    component: 'publicationEditor',
    title: `Publication ${pubId}`,
    componentParams: `pubId=${pubId}`,
    frameless: true,
    dimensions: { width: 800, height: 600, },
  }));

  makeWindowEndpoint('issue-scheduler', () => ISSUE_SCHEDULER_WINDOW_OPTS);

  makeWindowEndpoint('issue-editor', ({ issueId }: { issueId: number }) => ({
    component: 'issueEditor',
    title: `Issue ${issueId}`,
    componentParams: `issueId=${issueId}`,
    frameless: true,
    dimensions: { width: 800, height: 600, minWidth: 700, minHeight: 500 },
  }));

  ipcMain.on('scheduled-new-issue', (event: any) => {
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

  if (windows.length < 1) {
    log.verbose("No windows loaded at app launch, maybe will quit");
    maybeQuit();
  }

  log.verbose("Message home screen that app has loaded");
  messageHome('app-loaded');

});


async function messageHome(eventName: string) {
  const homeWindow = getWindowByTitle(APP_TITLE);
  if (homeWindow !== undefined) {
    await homeWindow.webContents.send(eventName);
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
