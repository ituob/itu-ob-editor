import * as path from 'path';

import { app, Menu, ipcMain } from 'electron';

import { openWindow, getWindowByTitle, windows } from 'sse/main/window';
import { makeEndpoint, makeWriteOnlyEndpoint, makeWindowEndpoint } from 'sse/api/main';
import { QuerySet, sortIntegerAscending, sortIntegerDescending } from 'sse/storage/query';
import { Index, IndexableObject } from 'sse/storage/query';
import { initRepo } from 'sse/storage/main/git-controller';

import { OBIssue, ScheduledIssue } from 'models/issues';

import { getMenu } from './menu';
import { initStorage, Workspace, Storage } from './storage';


const APP_TITLE = "ITU OB editor";


const WORK_DIR = path.join(app.getPath('userData'), 'itu-ob-data');
const REPO_URL = 'https://github.com/ituob/itu-ob-data';
const CORS_PROXY_URL = 'https://cors.isomorphic-git.org';


const ISSUE_SCHEDULER_WINDOW_OPTS = {
  component: 'issueScheduler',
  title: 'OB schedule',
  frameless: true,
  dimensions: { width: 600, height: 500 },
};


// Ensure only one instance of the app can run at a time on given user’s machine
if (!app.requestSingleInstanceLock()) { app.exit(0); }


initRepo(WORK_DIR, REPO_URL, CORS_PROXY_URL).then((gitCtrl) => {
  Promise.all([
    initStorage(WORK_DIR),
    app.whenReady(),
  ]).then((...args) => {
    const storage: Storage = args[0][0];

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
      openIssueScheduler: async () => await openWindow(ISSUE_SCHEDULER_WINDOW_OPTS),
      openHomeScreen,
    }));


    /* Set up endpoints */

    // TODO: Implement time travel (undo/redo) via main API endpoints.
    // Store whole workspace in one timeline, or have per-index / per-object timelines
    // and reconcile them somehow;
    // possibly record timeline states into a temporary file;
    // allow dispatching reducer actions through API endpoints (including types UNDO/REDO).

    for (let indexName of Object.keys(storage.workspace)) {
      makeEndpoint<Index<any>>(`storage-${indexName}-all`, async (newIndex?: Index<any>) => {
        if (newIndex) {
          await storage.storeWorkspace({ ...storage.workspace, [indexName]: newIndex });
        }
        return storage.workspace[indexName];
      });
      makeEndpoint<IndexableObject>(`storage-${indexName}`, async ({ objectId }: { objectId: string }, newObject?: IndexableObject) => {
        if (newObject) {
          await storage.storeManagers[indexName].store(newObject, storage);
        }
        return storage.workspace[indexName][objectId];
      });
      makeEndpoint<boolean>(`storage-${indexName}-delete`, async ({ objectId }: { objectId: string }) => {
        delete storage.workspace[indexName][objectId];
        await storage.storeManagers[indexName].storeIndex(storage, storage.workspace[indexName]);
        return true;
      });
    }

    makeEndpoint<Index<any>>('storage-search', async ({ query }: { query?: string }) => {
      return await storage.findObjects(query);
    });

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

      await gitCtrl.setAuthor({ name: authorName, email: authorEmail });

      try {
        await gitCtrl.setAuth({ username: gitUsername, password: gitPassword });
      } catch (e) {
        return { errors: [`Error while authenticating: ${e.toString()}`] };
      }

      try {
        await gitCtrl.pull();
      } catch (e) {
        return { errors: [`Error while fetching and merging changes: ${e.toString()}`] };
      }

      const changedFiles = await gitCtrl.listChangedFiles();
      if (changedFiles.length < 1) {
        return { errors: ["No changes to submit!"] };
      }

      await gitCtrl.addAllChanges();
      await gitCtrl.commit(commitMsg);

      try {
        await gitCtrl.push();
      } catch (e) {
        return { errors: [`Error while pushing changes: ${e.toString()}`] };
      }

      return { errors: [] };
    });

    makeEndpoint<OBIssue[]>('latest-published-issues', async () => {
      const issues = new QuerySet<OBIssue>(storage.workspace.issues);
      return issues.filter((item) => {
        return new Date(item[1].publication_date).getTime() < new Date().getTime();
      }).orderBy(sortIntegerDescending).all().slice(0, 1);
    });
    /* Home screen */

    makeEndpoint<{ id: number | null }>('current-issue-id', async () => {
      const issues = new QuerySet<OBIssue>(storage.workspace.issues);
      const currentIssue: OBIssue | null = issues.filter(item => {
        return new Date(item[1].publication_date).getTime() >= new Date().getTime();
      }).orderBy(sortIntegerAscending).all()[0] || null;
      return currentIssue ? { id: currentIssue.id } : { id: null };
    });

    makeEndpoint<ScheduledIssue[]>('ob-schedule', async () => {
      const issues = new QuerySet<OBIssue>(storage.workspace.issues);
      return issues.orderBy(sortIntegerAscending).all().map(issue => {
        return {
          id: issue.id,
          publication_date: issue.publication_date,
          cutoff_date: issue.cutoff_date,
        };
      });
    });

    makeEndpoint<{ success: boolean }>('ob-schedule-add', async (issue: ScheduledIssue) => {
      storage.workspace.issues[issue.id] = issue as OBIssue;
      await storage.storeWorkspace();
      return { success: true };
    });

    // TODO: Refactor into schedule-issue and do it one at a time?
    makeWriteOnlyEndpoint('future-issues', (issues: Index<OBIssue>) => {
      storage.workspace.issues = issues;
      storage.storeWorkspace(storage.workspace);
    });

    makeEndpoint<OBIssue>('issue', async ({ issueId }: { issueId: string }) => {
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

    makeWriteOnlyEndpoint('issue', ({ issueId }: { issueId: string }, issue: OBIssue) => {
      storage.workspace.issues[issue.id] = issue;
      storage.storeWorkspace();
    });


    /* Set up window-opening endpoints */

    makeWindowEndpoint('issue-scheduler', () => ISSUE_SCHEDULER_WINDOW_OPTS);

    makeWindowEndpoint('issue-editor', (issueId: string) => ({
      component: 'issueEditor',
      title: `Issue ${issueId}`,
      componentParams: `issueId=${issueId}`,
      frameless: true,
      dimensions: { width: 800, height: 600, },
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
      dimensions: { width: 800, minWidth: 600, height: 550 },
    }));

    makeWindowEndpoint('data-synchronizer', () => ({
      component: 'dataSynchronizer',
      title: 'Data Synchronizer',
      dimensions: { width: 800, minWidth: 600, height: 550 },
    }));

  });
});

async function openHomeScreen() {
  return await openWindow({
    component: 'home',
    title: APP_TITLE,
    dimensions: { width: 300, height: 400, },
    frameless: true,
  });
}
