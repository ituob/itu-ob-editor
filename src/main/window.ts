import * as path from 'path'
import { format as formatUrl } from 'url'
import { BrowserWindow } from 'electron'

const isDevelopment = process.env.NODE_ENV !== 'production'

export function createWindow(title: string, component: string, remote: any | undefined = undefined) {
  const WindowCls = remote ? remote.BrowserWindow : BrowserWindow;

  const window = new WindowCls({
    webPreferences: {nodeIntegration: true},
    title: title,
  })

  if (isDevelopment) {
    window.webContents.openDevTools()
  }

  if (isDevelopment) {
    window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}?c=${component}`)
  }
  else {
    window.loadURL(`${formatUrl({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file',
      slashes: true,
    })}?c=${component}`)
  }

  window.webContents.on('devtools-opened', () => {
    window.focus()
    setImmediate(() => {
      window.focus()
    })
  })

  return window
}
