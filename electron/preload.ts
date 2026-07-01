import { contextBridge, ipcRenderer, webUtils } from 'electron'

// Fetch the media server port synchronously at preload time.
// The HTTP server is guaranteed to be up before createWindow() is called.
const { port: mediaPort, token: mediaToken } = ipcRenderer.sendSync('media-server-info') as { port: number; token: string }
console.log(`[preload] mediaPort=${mediaPort}`)

contextBridge.exposeInMainWorld('canvas', {
  vault: {
    initFromPrefs:  ()                          => ipcRenderer.invoke('vault:init-from-prefs'),
    openDialog:     ()                          => ipcRenderer.invoke('vault:open-dialog'),
    create:         (path: string)              => ipcRenderer.invoke('vault:create', path),
    open:           (path: string)              => ipcRenderer.invoke('vault:open', path),
    getPath:        ()                          => ipcRenderer.invoke('vault:get-path'),
  },
  boards: {
    list:           ()                          => ipcRenderer.invoke('boards:list'),
    load:           (id: string)                => ipcRenderer.invoke('boards:load', id),
    save:           (board: unknown)            => ipcRenderer.invoke('boards:save', board),
    create:         (name: string)              => ipcRenderer.invoke('boards:create', name),
    delete:         (id: string)                => ipcRenderer.invoke('boards:delete', id),
    rename:         (id: string, name: string)  => ipcRenderer.invoke('boards:rename', { id, name }),
    setLast:        (id: string)                => ipcRenderer.invoke('boards:set-last', id),
  },
  files: {
    import:         (path: string)              => ipcRenderer.invoke('files:import', path),
    // Electron 32+ removed File.path from the renderer — this is the only way
    // to resolve the absolute path of a dragged-in file
    getPathForFile: (file: File)                => webUtils.getPathForFile(file),
    openExternal:   (rel: string)               => ipcRenderer.invoke('files:open-external', rel),
    showInFinder:   (rel: string)               => ipcRenderer.invoke('files:show-in-finder', rel),
    localUrl:       (rel: string)               => {
      // Encode each path segment individually so filenames with spaces/special
      // chars work, while keeping slashes as URL path separators.
      const encoded = rel.split('/').map(encodeURIComponent).join('/')
      return `http://127.0.0.1:${mediaPort}/${encoded}?token=${mediaToken}`
    },
  },
  app: {
    getVersion:     ()                          => ipcRenderer.invoke('get-version'),
    checkForUpdates:()                          => ipcRenderer.invoke('update:check'),
    installUpdate:  ()                          => ipcRenderer.invoke('update:install'),
    onUpdateStatus: (cb: (s: unknown) => void)  => {
      ipcRenderer.on('update-status', (_e, s) => cb(s))
      return () => ipcRenderer.removeAllListeners('update-status')
    },
  },
})
