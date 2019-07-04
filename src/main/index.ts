import { app } from 'electron'
import { createWindow } from './window'

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow: any

function createMainWindow() {
  const window = createWindow('ITU OB Editor', 'main');

  window.on('closed', () => {
    mainWindow = null
  })

  return window;
}

// quit application when all windows are closed
app.on('window-all-closed', () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (mainWindow === null) {
    mainWindow = createMainWindow()
  }
})

// create main BrowserWindow when electron is ready
app.on('ready', () => {
  mainWindow = createMainWindow();
})
