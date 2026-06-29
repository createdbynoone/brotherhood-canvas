# Brotherhood Canvas — CLAUDE.md

Electron app para mind maps y moodboards dinámicos con archivos multimedia. Vault local tipo Obsidian.

**GitHub:** `createdbynoone/brotherhood-canvas`
**Versión actual:** `v1.0.22`

## Stack
- Electron 31 + electron-vite + React 18 + TypeScript + Tailwind CSS
- **@xyflow/react** v12.3+ para el canvas
- electron-updater para auto-update desde GitHub Releases
- Preload compilado como **CJS** (`preload.cjs`)

## Estructura de archivos clave
```
electron/
  main.ts       — proceso principal, IPC handlers, HTTP media server, auto-update
  preload.ts    — expone window.canvas.* al renderer vía contextBridge (CJS)
src/
  components/
    BoardCanvas.tsx   — canvas principal, undo/redo, keyboard shortcuts, drag & drop
    ContextMenu.tsx   — menú contextual (copy, paste, show in finder, duplicate, etc.)
    nodes/
      NodeShell.tsx   — wrapper compartido con handles y resizer
      ImageNode.tsx
      VideoNode.tsx   — onMouseDown preventDefault en inner div para que Backspace funcione
      PDFNode.tsx
      TextNode.tsx / NoteNode.tsx / TitleNode.tsx
  types/index.ts      — tipos compartidos, ContextMenuState, CanvasAPI
scripts/
  publish.sh    — build arm64 + x64, crea GitHub release con todos los artifacts
```

## Dev
```bash
npm run dev                    # puerto 5173 (puede conflictuar con app instalada)
RENDERER_PORT=5200 npm run dev # usar otro puerto si la app instalada ya corre
```
El `electron.vite.config.ts` lee `process.env.RENDERER_PORT` para cambiar el puerto del renderer.

## Release
```bash
GH_TOKEN=xxx bash scripts/publish.sh
```
El script: build ambas arquitecturas → crea GitHub release → sube todos los artifacts.

**Assets obligatorios en cada release:**
- `Brotherhood Canvas-X.X.X-arm64.dmg` + `.blockmap`
- `Brotherhood Canvas-X.X.X-mac.zip` + `.blockmap` (x64)
- `Brotherhood Canvas-X.X.X-arm64-mac.zip` + `.blockmap`
- `Brotherhood Canvas-X.X.X.dmg` + `.blockmap` (x64)
- **`latest-mac.yml`** ← sin este el auto-updater tira 404 y no puede actualizar

**NUNCA `--publish always`** en electron-builder — causa sha512 mismatch por doble firma paralela.

## HTTP Media Server
- Node.js `http.createServer` en `127.0.0.1:0` (puerto aleatorio) para servir archivos del vault
- Soporta Range requests (HTTP 206) para streaming de video
- CSP en `src/index.html` incluye `http://127.0.0.1:*` en `img-src`, `media-src`, `connect-src`
- Puerto expuesto al renderer vía `ipcRenderer.sendSync('media-server-port')` en el preload

## IPC API (window.canvas)
- `vault.*` — initFromPrefs, openDialog, create, open, getPath
- `boards.*` — list, load, save, create, delete, rename, setLast
- `files.*` — import, openExternal, showInFinder, localUrl
- `app.*` — getVersion, checkForUpdates, installUpdate, onUpdateStatus

## Canvas features
- **Undo/Redo:** Cmd+Z / Cmd+Shift+Z — stack de 80 estados en `historyRef`
- **Context menu:** Copy, Paste, Show in Finder (solo image/video), Duplicate, Bring to Front, Send to Back, Delete
- **Copy/paste cross-board:** `canvasClipboard` module-level persiste entre boards
- **Alignment guides:** snap a edges y centros de otros nodos (threshold 8px)
- **Drag & drop:** archivos de Finder al canvas, deduplicados por SHA-256

## Patrones críticos

### Video node + Backspace
El inner div del VideoNode tiene `onMouseDown={e => e.preventDefault()}`. Sin esto, el click para play/pause mueve el foco fuera del wrapper de React Flow y Backspace no puede eliminar el nodo.

### Vault de boards
`boards:save` lee el nombre del archivo existente en disco antes de escribir para no pisar un rename reciente (el `boardMetaRef` del renderer puede quedar stale).

### Auto-update delay
1500ms entre `ditto` y `app.relaunch()` para que el OS termine de vaciar buffers antes de que el nuevo proceso lea el binario.

## Colores / tipografía
- Accent: `#E8B547`
- Space Grotesk (`font-heading`), Inter (`font-sans`), JetBrains Mono (`font-mono`)
- Cargadas via Google Fonts en `src/index.html`
