import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'CaptUp - Video Editor',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    frame: true,
    titleBarStyle: 'hiddenInset',
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('open-file-dialog', async (_event, options: { filters?: Electron.FileFilter[] }) => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: options.filters || [
      { name: 'Media Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'ogg', 'png', 'jpg', 'jpeg', 'gif', 'webp'] },
      { name: 'Video', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
      { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'aac'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
    ],
  });

  if (result.canceled) return [];
  return result.filePaths;
});

ipcMain.handle('get-file-info', async (_event, filePath: string) => {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const name = path.basename(filePath);

    let type: 'video' | 'audio' | 'image' = 'video';
    if (['.mp3', '.wav', '.ogg', '.aac', '.flac'].includes(ext)) {
      type = 'audio';
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'].includes(ext)) {
      type = 'image';
    }

    return {
      name,
      path: filePath,
      type,
      size: stats.size,
      addedAt: Date.now(),
    };
  } catch {
    return null;
  }
});

ipcMain.handle('save-project', async (_event, projectData: string) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'CaptUp Project', extensions: ['captup'] }],
    defaultPath: 'project.captup',
  });

  if (result.canceled || !result.filePath) return null;
  fs.writeFileSync(result.filePath, projectData, 'utf-8');
  return result.filePath;
});

ipcMain.handle('load-project', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'CaptUp Project', extensions: ['captup'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  const data = fs.readFileSync(result.filePaths[0], 'utf-8');
  return data;
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
