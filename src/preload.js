const { contextBridge, ipcRenderer } = require('electron');
const invoke = channel => (...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('soul', {
  readControls: invoke('controls-read'), setControl: invoke('controls-set'),
  mediaState: invoke('media-state'), clipboardState: invoke('clipboard-state'),
  seek: invoke('media-seek'), radios: invoke('radios-state'), setRadio: invoke('radio-set'),
  state: invoke('state'), expand: invoke('expand'), layout: invoke('layout'), settled: invoke('motion-settled'), hide: invoke('hide'), apps: invoke('apps'),
  addPin: invoke('pin-add'), pin: invoke('pin'), unpin: invoke('unpin'), open: invoke('open'), reveal: invoke('reveal'),
  addRoot: invoke('root-add'), removeRoot: invoke('root-remove'), search: invoke('search'), settings: invoke('settings'), preference: invoke('preference'),
  indexState: invoke('search-index-state'), reindex: invoke('search-reindex'), cancelSearch: invoke('search-cancel'),
  searchSetup: invoke('search-setup'),
  onSearchIndex: callback=>ipcRenderer.on('search-index',(_event,status)=>callback(status)),
  copyClip: invoke('clip-copy'), removeClip: invoke('clip-remove'), clearClips: invoke('clip-clear'), media: invoke('media'), power: invoke('power'),
  onExpanded: callback => ipcRenderer.on('expanded', (_event, open) => callback(open)),
  onClips: callback => ipcRenderer.on('clips', (_event, payload) => callback(payload)),
  onClipboardError: callback => ipcRenderer.on('clipboard-error', (_event, message) => callback(message)),
  onStorageError: callback => ipcRenderer.on('storage-error', (_event, message) => callback(message)),
  onAppsReady: callback => ipcRenderer.on('apps-ready', () => callback())
});

