import { app, ipcMain, BrowserWindow } from 'electron'
import { createWindow } from './window'


app.on('ready', () => {
  _openIssueScheduler();
})

ipcMain.on('edit-issue', (event: any, issueId: string) => {
  _openIssueEditor(issueId);
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
    _openIssueScheduler();
  }
})


function _openIssueEditor(issueId: string) {
  _createWindow('issueEditor', `Edit ITU OB issue ${issueId}`, `c=issueEditor&issueId=${issueId}`);
}

function _openIssueScheduler() {
  _createWindow('issueScheduler', 'ITU OB issues', 'c=issueScheduler');
}


function _createWindow(id: string, title: string, component: string): BrowserWindow {
  const window = createWindow(title, component);

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
