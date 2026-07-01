import { useState, useEffect, useRef, useCallback } from 'react'

export default function SettingsPanel() {
  const [open, setOpen]           = useState(false)
  const [vaultPath, setVaultPath] = useState('')
  const [copied, setCopied]       = useState(false)
  const [volume, setVolume]       = useState(() =>
    parseFloat(localStorage.getItem('app-volume') ?? '1')
  )
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    window.canvas.vault.getPath().then((p: string) => setVaultPath(p))
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const handleVolume = useCallback((v: number) => {
    setVolume(v)
    localStorage.setItem('app-volume', String(v))
    window.dispatchEvent(new CustomEvent('app:volume', { detail: v }))
  }, [])

  function copyPath() {
    navigator.clipboard.writeText(vaultPath)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const volPct = Math.round(volume * 100)

  return (
    <div ref={panelRef} className="absolute top-3 right-3 z-50 no-drag">
      {/* Gear button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/8 transition-colors"
        title="Settings"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* Popup */}
      {open && (
        <div className="absolute top-9 right-0 w-72 rounded-xl border border-border bg-bg-elevated shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">Settings</p>
          </div>

          {/* Vault path */}
          <div className="px-4 py-3 border-b border-border/40">
            <p className="text-[10.5px] font-medium uppercase tracking-wider text-text-secondary mb-1.5">Vault</p>
            <div className="flex items-center gap-2 bg-bg rounded-md border border-border/50 px-2.5 py-1.5">
              <p className="flex-1 text-[11px] font-mono text-text-primary truncate" title={vaultPath}>
                {vaultPath || '—'}
              </p>
              <button
                onClick={copyPath}
                className="flex-shrink-0 text-text-secondary hover:text-text-primary transition-colors"
                title="Copy path"
              >
                {copied ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Volume */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-text-secondary">Volume</p>
              <span className="text-[11px] font-mono text-text-secondary">{volPct}%</span>
            </div>
            <div className="flex items-center gap-2.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-secondary flex-shrink-0">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              </svg>
              <input
                type="range"
                min="0" max="1" step="0.01"
                value={volume}
                onChange={e => handleVolume(parseFloat(e.target.value))}
                className="flex-1 h-1 rounded-full appearance-none bg-border cursor-pointer accent-accent"
                style={{ accentColor: '#E8B547' }}
              />
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-secondary flex-shrink-0">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
