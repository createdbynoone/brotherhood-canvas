import { useState } from 'react'
import type { VaultState } from '../types'

interface Props {
  onVaultReady: (vault: VaultState) => void
}

export default function WelcomeScreen({ onVaultReady }: Props) {
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleCreate() {
    setError(null)
    const path = await window.canvas.vault.openDialog()
    if (!path) return
    setLoading(true)
    try {
      const { vaultName } = await window.canvas.vault.create(path)
      onVaultReady({ path, name: vaultName })
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleOpen() {
    setError(null)
    const path = await window.canvas.vault.openDialog()
    if (!path) return
    setLoading(true)
    try {
      const res = await window.canvas.vault.open(path)
      if (!res.valid) {
        setError('This folder is not a Brotherhood Canvas vault. Create a new vault instead.')
        return
      }
      onVaultReady({ path, name: res.vaultName ?? 'My Canvas' })
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="drag-region w-full h-full flex flex-col items-center justify-center bg-bg">
      <div className="no-drag flex flex-col items-center gap-8 max-w-md w-full px-8">
        {/* Logo / Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8B547" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <line x1="10" y1="6.5" x2="14" y2="6.5" />
              <line x1="10" y1="17.5" x2="14" y2="17.5" />
              <line x1="6.5" y1="10" x2="6.5" y2="14" />
              <line x1="17.5" y1="10" x2="17.5" y2="14" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="font-heading text-[22px] font-semibold text-text-primary tracking-tight">
              Brotherhood Canvas
            </h1>
            <p className="text-[13.7px] text-text-secondary mt-1">
              Visual boards, saved locally
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-accent text-bg font-medium text-[14.7px] hover:bg-accent/90 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create New Vault
          </button>

          <button
            onClick={handleOpen}
            disabled={loading}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-surface border border-border text-text-primary text-[14.7px] hover:bg-[#1a1a1a] active:scale-[0.99] transition-all disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 12H19M12 5l7 7-7 7" />
            </svg>
            Open Existing Vault
          </button>
        </div>

        {error && (
          <p className="text-[12.7px] text-red-400 text-center px-2">{error}</p>
        )}

        {loading && (
          <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        )}

        <p className="text-[11.7px] text-text-muted text-center">
          Boards are saved as JSON files in a local folder you choose — no cloud, no sync.
        </p>
      </div>
    </div>
  )
}
