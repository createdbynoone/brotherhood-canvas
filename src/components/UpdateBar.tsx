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

  return (
    <div className="no-drag flex items-center gap-3 px-4 py-1.5 bg-surface border-b border-border text-[11.7px] text-text-secondary">

      {status.phase === 'available' && (
        <>
          <span className="text-accent">↓</span>
          <span>Downloading update v{(status as { version: string }).version}…</span>
          <button onClick={() => setDismissed(true)} className="ml-auto text-text-muted hover:text-text-secondary">✕</button>
        </>
      )}

      {status.phase === 'downloading' && (
        <>
          <div className="w-28 h-1.5 bg-border rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${(status as { pct: number }).pct}%` }}
            />
          </div>
          <span>{(status as { pct: number }).pct}%</span>
        </>
      )}

      {status.phase === 'installing' && (
        <span>Installing update… app will restart shortly</span>
      )}

      {status.phase === 'ready' && (
        <span className="text-accent">Update installed — restarting…</span>
      )}

      {status.phase === 'error' && (
        <>
          <span className="text-red-400">Update error: {(status as { message: string }).message}</span>
          <button onClick={() => setDismissed(true)} className="ml-auto text-text-muted hover:text-text-secondary">✕</button>
        </>
      )}

    </div>
  )
}
