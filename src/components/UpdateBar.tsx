import { useState, useEffect } from 'react'
import type { UpdateStatus } from '../types'

export default function UpdateBar() {
  const [status, setStatus] = useState<UpdateStatus>({ phase: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const off = window.canvas.app.onUpdateStatus(s => {
      setStatus(s as UpdateStatus)
      setDismissed(false)
    })
    return off
  }, [])

  if (status.phase === 'idle' || dismissed) return null

  const isAvailable = status.phase === 'available'
  const isDownloading = status.phase === 'downloading'
  const isInstalling = status.phase === 'installing'
  const isReady = status.phase === 'ready'
  const isError = status.phase === 'error'

  return (
    <div className="no-drag flex items-center gap-3 px-4 py-1.5 bg-surface border-b border-border text-[11.7px] text-text-secondary">
      {isAvailable && (
        <>
          <span>Update available — v{(status as { version: string }).version}</span>
          <button onClick={() => window.canvas.app.checkForUpdates()} className="text-accent hover:underline">Download</button>
          <button onClick={() => setDismissed(true)} className="ml-auto text-text-muted hover:text-text-secondary">✕</button>
        </>
      )}
      {isDownloading && (
        <>
          <div className="w-24 h-1 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${(status as { pct: number }).pct}%` }} />
          </div>
          <span>Downloading… {(status as { pct: number }).pct}%</span>
        </>
      )}
      {isInstalling && <span>Installing update…</span>}
      {isReady && (
        <>
          <span>Ready to install — v{(status as { version: string }).version}</span>
          <button onClick={() => window.canvas.app.installUpdate()} className="text-accent hover:underline">Restart &amp; Install</button>
          <button onClick={() => setDismissed(true)} className="ml-auto text-text-muted hover:text-text-secondary">✕</button>
        </>
      )}
      {isError && (
        <>
          <span className="text-red-400">Update error: {(status as { message: string }).message}</span>
          <button onClick={() => setDismissed(true)} className="ml-auto text-text-muted hover:text-text-secondary">✕</button>
        </>
      )}
    </div>
  )
}
