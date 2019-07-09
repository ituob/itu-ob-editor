import { app, Menu, ipcMain, BrowserWindow } from 'electron';
import { createWindow } from './window';
import { getMenu } from './menu';


// Keeps track of windows and ensures (?) they do not get garbage collected
var windows: BrowserWindow[] = [];

var schedulerWindow: BrowserWindow | null = null;
var homeWindow: BrowserWindow | null = null;
var issueEditorsOpen: { [id: string]: BrowserWindow | null } = {};


Menu.setApplicationMenu(getMenu({
  openIssueScheduler,
  openHomeScreen,
}));


app.on('ready', () => {
  openHomeScreen();
})

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
})

app.on('activate', () => {
  // On macOS it is common to re-create a window even after all windows have been closed
  if (windows.length < 1) {
    openHomeScreen();
  }
})


function openHomeScreen() {
  if (homeWindow === null) {
    homeWindow = _createWindow(
      'home',
      "ITU OB editor",
      `c=home`, {
        width: 400,
        height: 400,
        frame: process.platform === 'darwin' ? true : false,
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
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
    schedulerWindow = _createWindow(
      'issueScheduler',
      'Issue Scheduler',
      'c=issueScheduler', {
        width: 400,
        minWidth: 380,
        frame: process.platform === 'darwin' ? true : false,
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
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
    issueEditorsOpen[issueId] = _createWindow(
      'issueEditor',
      `Issue ${issueId}`,
      `c=issueEditor&issueId=${issueId}`, {
        width: 800,
        height: 600,
        frame: process.platform === 'darwin' ? true : false,
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
      });
    (issueEditorsOpen[issueId] as BrowserWindow).on('close', () => {
      issueEditorsOpen[issueId] = null;
    });
  } else {
    (issueEditorsOpen[issueId] as BrowserWindow).focus();
  }
}


function _createWindow(id: string, title: string, params: string, winParams: any): BrowserWindow {
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
