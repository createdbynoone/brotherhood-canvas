import { app, BrowserWindow, ipcMain, protocol, dialog, shell } from 'electron'
import { join } from 'path'
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync,
  unlinkSync, createWriteStream,
} from 'fs'
import { createHash } from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'
import https from 'https'
import { v4 as uuidv4 } from 'uuid'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater
const execAsync = promisify(exec)

// ─── Constants ────────────────────────────────────────────────────────────────
const PREFS_FILE    = 'canvas-prefs.json'
const VAULT_MANIFEST = 'vault.json'
const BOARDS_DIR    = 'boards'
const BOARDS_INDEX  = 'boards/index.json'
const ATTACHMENTS_DIR = 'attachments'

// ─── MIME / node-type maps ────────────────────────────────────────────────────
const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  mkv: 'video/x-matroska', avi: 'video/x-msvideo',
  pdf: 'application/pdf',
  txt: 'text/plain', md: 'text/markdown',
}
const NODE_TYPE_MAP: Record<string, string> = {
  'image/jpeg': 'image', 'image/png': 'image', 'image/gif': 'image',
  'image/webp': 'image', 'image/svg+xml': 'image',
  'video/mp4': 'video', 'video/quicktime': 'video', 'video/webm': 'video',
  'video/x-matroska': 'video', 'video/x-msvideo': 'video',
  'application/pdf': 'pdf',
  'text/plain': 'text', 'text/markdown': 'text',
}

function getMime(ext: string): string {
  return MIME[ext.toLowerCase()] ?? 'application/octet-stream'
}
function getNodeType(mime: string): string {
  return NODE_TYPE_MAP[mime] ?? 'file'
}

// ─── State ────────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null
let vaultPath: string | null = null

// ─── Prefs ────────────────────────────────────────────────────────────────────
interface Prefs {
  vaultPath: string | null
  lastBoardId: string | null
  windowBounds?: { x: number; y: number; width: number; height: number }
}

function prefsFilePath(): string {
  return join(app.getPath('userData'), PREFS_FILE)
}
function loadPrefs(): Prefs {
  try {
    if (existsSync(prefsFilePath())) {
      return JSON.parse(readFileSync(prefsFilePath(), 'utf-8'))
    }
  } catch { /* empty */ }
  return { vaultPath: null, lastBoardId: null }
}
function savePrefs(prefs: Prefs): void {
  writeFileSync(prefsFilePath(), JSON.stringify(prefs, null, 2))
}

// ─── Vault helpers ────────────────────────────────────────────────────────────
function vaultFile(rel: string): string {
  return join(vaultPath!, rel)
}

function initVaultDirs(path: string): void {
  for (const dir of [path, join(path, BOARDS_DIR), join(path, ATTACHMENTS_DIR)]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
  const mf = join(path, VAULT_MANIFEST)
  if (!existsSync(mf)) {
    writeFileSync(mf, JSON.stringify({ version: '1.0', name: 'My Canvas', createdAt: new Date().toISOString() }, null, 2))
  }
  const idx = join(path, BOARDS_INDEX)
  if (!existsSync(idx)) {
    writeFileSync(idx, JSON.stringify({ boards: [] }, null, 2))
  }
}

function isValidVault(path: string): boolean {
  return existsSync(join(path, VAULT_MANIFEST))
}

function getVaultMeta(path: string): { name: string } {
  try {
    return JSON.parse(readFileSync(join(path, VAULT_MANIFEST), 'utf-8'))
  } catch {
    return { name: 'My Canvas' }
  }
}

// ─── Board index helpers ──────────────────────────────────────────────────────
interface BoardMeta {
  id: string; name: string; createdAt: string; updatedAt: string; nodeCount: number
}
interface BoardIndex { boards: BoardMeta[] }

function loadBoardIndex(): BoardIndex {
  try {
    return JSON.parse(readFileSync(vaultFile(BOARDS_INDEX), 'utf-8'))
  } catch {
    return { boards: [] }
  }
}
function saveBoardIndex(idx: BoardIndex): void {
  writeFileSync(vaultFile(BOARDS_INDEX), JSON.stringify(idx, null, 2))
}

// ─── File import ──────────────────────────────────────────────────────────────
interface ImportResult {
  relativePath: string; fileName: string; mimeType: string; fileSize: number; nodeType: string; content?: string
}

function importFileToVault(sourcePath: string): ImportResult {
  if (!vaultPath) throw new Error('No vault open')
  if (!existsSync(sourcePath)) throw new Error('File not found')

  const buffer = readFileSync(sourcePath)
  const hash   = createHash('sha256').update(buffer).digest('hex').slice(0, 16)
  const ext    = (sourcePath.split('.').pop() ?? 'bin').toLowerCase()
  const stored = `${hash}.${ext}`
  const dest   = join(vaultPath, ATTACHMENTS_DIR, stored)

  if (!existsSync(dest)) writeFileSync(dest, buffer)

  const originalName = sourcePath.split('/').pop() ?? stored
  const mimeType     = getMime(ext)
  const nodeType     = getNodeType(mimeType)

  const result: ImportResult = {
    relativePath: `${ATTACHMENTS_DIR}/${stored}`,
    fileName: originalName,
    mimeType,
    fileSize: buffer.length,
    nodeType,
  }

  if (nodeType === 'text') {
    result.content = buffer.toString('utf-8').slice(0, 60000)
  }

  return result
}

// ─── Auto-update helpers ──────────────────────────────────────────────────────
function pushUpdate(status: unknown): void {
  mainWindow?.webContents.send('update-status', status)
}

function downloadWithProgress(url: string, dest: string, onPct: (n: number) => void): Promise<void> {
  if (!url.startsWith('https://')) return Promise.reject(new Error('HTTPS only'))
  return new Promise((resolve, reject) => {
    const attempt = (u: string) => {
      if (!u.startsWith('https://')) { reject(new Error('Redirect blocked')); return }
      const parsed = new URL(u)
      https.get({ hostname: parsed.hostname, path: parsed.pathname + parsed.search }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          attempt(res.headers.location); return
        }
        const total = parseInt(res.headers['content-length'] ?? '0', 10)
        let received = 0
        const file = createWriteStream(dest)
        res.on('data', (chunk: Buffer) => { received += chunk.length; if (total > 0) onPct(Math.round(received / total * 100)) })
        res.pipe(file)
        file.on('finish', () => file.close(() => resolve()))
        file.on('error', reject)
      }).on('error', reject)
    }
    attempt(url)
  })
}

async function doInstallUpdate(downloadUrl?: string): Promise<void> {
  if (!downloadUrl) { autoUpdater.quitAndInstall(false, true); return }
  const tmp     = app.getPath('temp')
  const dmgPath = join(tmp, 'BrotherhoodCanvas-update.dmg')
  pushUpdate({ phase: 'downloading', pct: 0 })
  await downloadWithProgress(downloadUrl, dmgPath, pct => pushUpdate({ phase: 'downloading', pct }))
  pushUpdate({ phase: 'installing' })
  try {
    const { stdout } = await execAsync(`hdiutil attach -nobrowse -plist "${dmgPath}"`)
    const mps = stdout.match(/<string>(\/Volumes\/[^<]+)<\/string>/g)?.map(s => s.replace(/<\/?string>/g, ''))
    if (!mps?.length) throw new Error('No mount point')
    const mp     = mps[mps.length - 1]
    const appDir = readdirSync(mp).find(f => f.endsWith('.app'))
    if (!appDir) throw new Error('No .app in DMG')
    await execAsync(`ditto "${join(mp, appDir)}" "/Applications/${appDir}"`)
    await execAsync(`hdiutil detach -quiet -force "${mp}"`)
    app.relaunch(); app.quit()
  } catch {
    await shell.openPath(dmgPath)
  }
}

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow(): void {
  const prefs = loadPrefs()
  const b = prefs.windowBounds

  mainWindow = new BrowserWindow({
    width:  b?.width  ?? 1440,
    height: b?.height ?? 920,
    x: b?.x, y: b?.y,
    minWidth: 900, minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0c0c0c',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.cjs'),
      sandbox: true,
      contextIsolation: true,
    },
  })

  mainWindow.on('close', () => {
    if (!mainWindow) return
    const bounds = mainWindow.getBounds()
    savePrefs({ ...loadPrefs(), windowBounds: bounds })
  })

  mainWindow.webContents.on('will-navigate', e => e.preventDefault())

  if (app.isPackaged) {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  } else {
    mainWindow.loadURL('http://localhost:5173')
  }
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0) }

app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus() }
})

app.whenReady().then(() => {
  // Serve vault files via localfile:// protocol
  protocol.handle('localfile', req => {
    try {
      const rel  = decodeURIComponent(req.url.replace('localfile://', ''))
      if (!vaultPath) return new Response('No vault', { status: 404 })
      const abs  = join(vaultPath, rel)
      if (!existsSync(abs)) return new Response('Not found', { status: 404 })
      const ext  = (abs.split('.').pop() ?? '').toLowerCase()
      const data = readFileSync(abs)
      return new Response(data, { headers: { 'Content-Type': getMime(ext) } })
    } catch {
      return new Response('Error', { status: 500 })
    }
  })

  createWindow()

  // Auto-update setup
  autoUpdater.autoDownload = false
  autoUpdater.logger = null
  let pendingDmgUrl: string | undefined

  autoUpdater.on('update-available', info => pushUpdate({ phase: 'available', version: info.version }))
  autoUpdater.on('download-progress', p => pushUpdate({ phase: 'downloading', pct: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', info => {
    pendingDmgUrl = (info as unknown as Record<string, unknown>).downloadedFile as string | undefined
    pushUpdate({ phase: 'ready', version: info.version })
  })
  autoUpdater.on('error', err => pushUpdate({ phase: 'error', message: String(err?.message ?? err) }))

  if (app.isPackaged) setTimeout(() => autoUpdater.checkForUpdates(), 4000)

  // Install IPC that needs pendingDmgUrl closure
  ipcMain.handle('update:install', () => doInstallUpdate(pendingDmgUrl))

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

// ─── IPC — Vault ─────────────────────────────────────────────────────────────
ipcMain.handle('vault:init-from-prefs', () => {
  const p = loadPrefs()
  if (p.vaultPath && isValidVault(p.vaultPath)) {
    vaultPath = p.vaultPath
    const { name } = getVaultMeta(p.vaultPath)
    return { valid: true, vaultPath: p.vaultPath, vaultName: name, lastBoardId: p.lastBoardId }
  }
  return { valid: false, vaultPath: null, vaultName: null, lastBoardId: null }
})

ipcMain.handle('vault:open-dialog', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'], title: 'Select Vault Folder' })
  return r.canceled ? null : r.filePaths[0]
})

ipcMain.handle('vault:create', (_e, path: string) => {
  if (typeof path !== 'string' || path.includes('..')) throw new Error('Invalid path')
  initVaultDirs(path)
  vaultPath = path
  savePrefs({ ...loadPrefs(), vaultPath: path })
  return { vaultName: getVaultMeta(path).name }
})

ipcMain.handle('vault:open', (_e, path: string) => {
  if (typeof path !== 'string' || path.includes('..')) throw new Error('Invalid path')
  if (!isValidVault(path)) return { valid: false }
  vaultPath = path
  savePrefs({ ...loadPrefs(), vaultPath: path })
  return { valid: true, vaultName: getVaultMeta(path).name }
})

// ─── IPC — Boards ─────────────────────────────────────────────────────────────
ipcMain.handle('boards:list', () => {
  if (!vaultPath) return []
  return loadBoardIndex().boards
})

ipcMain.handle('boards:load', (_e, id: string) => {
  if (!vaultPath) throw new Error('No vault')
  const p = vaultFile(`${BOARDS_DIR}/${id}.json`)
  if (!existsSync(p)) throw new Error('Board not found: ' + id)
  return JSON.parse(readFileSync(p, 'utf-8'))
})

ipcMain.handle('boards:save', (_e, board: BoardMeta & Record<string, unknown>) => {
  if (!vaultPath) throw new Error('No vault')
  if (typeof board?.id !== 'string') throw new Error('Invalid board')
  const p = vaultFile(`${BOARDS_DIR}/${board.id}.json`)
  writeFileSync(p, JSON.stringify(board, null, 2))
  const idx = loadBoardIndex()
  const meta: BoardMeta = {
    id: board.id, name: String(board.name ?? 'Untitled'),
    createdAt: String(board.createdAt ?? new Date().toISOString()),
    updatedAt: String(board.updatedAt ?? new Date().toISOString()),
    nodeCount: Array.isArray(board.nodes) ? board.nodes.length : 0,
  }
  const i = idx.boards.findIndex(b => b.id === board.id)
  if (i >= 0) idx.boards[i] = meta; else idx.boards.push(meta)
  saveBoardIndex(idx)
})

ipcMain.handle('boards:create', (_e, name: string) => {
  if (!vaultPath) throw new Error('No vault')
  const id  = uuidv4()
  const now = new Date().toISOString()
  const board = { id, name, createdAt: now, updatedAt: now, nodeCount: 0, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 }, background: 'dots' }
  writeFileSync(vaultFile(`${BOARDS_DIR}/${id}.json`), JSON.stringify(board, null, 2))
  const idx = loadBoardIndex()
  idx.boards.unshift({ id, name, createdAt: now, updatedAt: now, nodeCount: 0 })
  saveBoardIndex(idx)
  savePrefs({ ...loadPrefs(), lastBoardId: id })
  return board
})

ipcMain.handle('boards:delete', (_e, id: string) => {
  if (!vaultPath || typeof id !== 'string') throw new Error('Invalid')
  const p = vaultFile(`${BOARDS_DIR}/${id}.json`)
  if (existsSync(p)) unlinkSync(p)
  const idx = loadBoardIndex()
  idx.boards = idx.boards.filter(b => b.id !== id)
  saveBoardIndex(idx)
})

ipcMain.handle('boards:rename', (_e, { id, name }: { id: string; name: string }) => {
  if (!vaultPath || typeof id !== 'string') throw new Error('Invalid')
  const p = vaultFile(`${BOARDS_DIR}/${id}.json`)
  if (existsSync(p)) {
    const board = JSON.parse(readFileSync(p, 'utf-8'))
    board.name = name; board.updatedAt = new Date().toISOString()
    writeFileSync(p, JSON.stringify(board, null, 2))
  }
  const idx = loadBoardIndex()
  const b = idx.boards.find(b => b.id === id)
  if (b) { b.name = name; b.updatedAt = new Date().toISOString() }
  saveBoardIndex(idx)
})

ipcMain.handle('boards:set-last', (_e, id: string) => {
  savePrefs({ ...loadPrefs(), lastBoardId: id })
})

// ─── IPC — Files ──────────────────────────────────────────────────────────────
ipcMain.handle('files:import', (_e, sourcePath: string) => {
  if (typeof sourcePath !== 'string' || sourcePath.includes('..')) throw new Error('Invalid path')
  return importFileToVault(sourcePath)
})

ipcMain.handle('files:open-external', (_e, relativePath: string) => {
  if (!vaultPath || typeof relativePath !== 'string') throw new Error('Invalid')
  return shell.openPath(join(vaultPath, relativePath))
})

// ─── IPC — App ────────────────────────────────────────────────────────────────
ipcMain.handle('get-version', () => app.getVersion())
ipcMain.handle('update:check', () => autoUpdater.checkForUpdates())
