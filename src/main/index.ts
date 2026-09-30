import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerGithubIpc } from './ipc/github.ipc'
import { registerChatIpc } from './ipc/chat.ipc'
import { registerSettingsIpc } from './ipc/settings.ipc'
import { registerYoutubeIpc } from './ipc/youtube.ipc'
import { registerHuggingfaceIpc } from './ipc/huggingface.ipc'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })


  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (details.url.startsWith('http://') || details.url.startsWith('https://')) {
      shell.openExternal(details.url)
    }
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerGithubIpc()
  registerChatIpc()
  registerSettingsIpc()
  registerYoutubeIpc()
  registerHuggingfaceIpc()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
