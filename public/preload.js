/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

const { contextBridge, ipcRenderer } = require('electron');

let appOnBeforeClose = () => {};

contextBridge.exposeInMainWorld('electron', {
  app: {
    onBeforeClose(callback) {
      appOnBeforeClose = callback;
    },
  }
});

// catch events from main
ipcRenderer.on('webcontents-app-before-close', _ => {
  appOnBeforeClose();
});