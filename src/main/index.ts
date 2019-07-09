import { app, ipcMain, BrowserWindow } from 'electron'
import { createWindow } from './window'


var schedulerWindow: BrowserWindow | null = null;
var homeWindow: BrowserWindow | null = null;


app.on('ready', () => {
  if (homeWindow === null) {
    homeWindow = openHomeScreen();
    homeWindow.on('close', () => {
      homeWindow = null;
    });
  }
})

ipcMain.on('schedule-issues', (event: any) => {
  if (schedulerWindow === null) {
    schedulerWindow = openIssueScheduler();
    schedulerWindow.on('close', () => {
      schedulerWindow = null;
    });
  }
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
  return _createWindow(
    'home',
    "ITU OB editor",
    `c=home`, {
      width: 400,
      height: 400,
      frame: process.platform === 'darwin' ? true : false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    });
}

function openIssueScheduler() {
  return _createWindow(
    'issueScheduler',
    'ITU OB issues',
    'c=issueScheduler', {
      width: 400,
      minWidth: 380,
      frame: process.platform === 'darwin' ? true : false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    });
}

function openIssueEditor(issueId: string) {
  _createWindow(
    'issueEditor',
    `Edit ITU OB issue ${issueId}`,
    `c=issueEditor&issueId=${issueId}`, {
      width: 800,
      height: 600,
      frame: process.platform === 'darwin' ? true : false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    });
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

// Keeps track of windows and ensures (?) they do not get garbage collected
var windows: BrowserWindow[] = [];
