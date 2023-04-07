/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

const path = require('path');
const { app, BrowserWindow, Menu } = require('electron');
const isDev = require('electron-is-dev');
const Store = require('electron-store');

// store
const store = new Store();

// disable smooth scrolling
app.commandLine.appendSwitch('disable-smooth-scrolling', 'true');

function createWindow() {
  // no menu
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // manage win state from store
  const getWinState = () => {
    const winState = store.get('windowState', {
      x: undefined,
      y: undefined,
      width: 1080,
      height: 768,
    });
    return winState;
  };

  const setWinState = () => {
    const winState = win.getBounds();
    store.set('windowState', winState);
  };

  // Create the browser window.
  const winState = getWinState();
  const win = new BrowserWindow({
    x: winState.x,
    y: winState.y,
    width: winState.width,
    height: winState.height,
    backgroundColor: '#282c34',
    icon: path.join(__dirname, 'logo192.png'),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.resolve(__dirname, "preload.js"),
    },
  });

  // set win state in setore
  win.on('resize', setWinState);
  win.on('move', setWinState);
  win.on('close', setWinState);

  win.once('ready-to-show', () => {
    win.show();
  });

  // and load the index.html of the app.
  // win.loadFile("index.html");
  win.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );
  // Open the DevTools.
  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  win.on('close', (e) => {
    win.webContents.send('webcontents-app-before-close');
  });
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  app.quit();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});