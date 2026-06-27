import { useState, useRef, useEffect } from 'react'
import type { BoardMeta } from '../types'

interface Props {
  boards: BoardMeta[]
  activeBoardId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}

interface ContextMenu { id: string; x: number; y: number }

export default function Sidebar({ boards, activeBoardId, onSelect, onCreate, onDelete, onRename }: Props) {
  const [search, setSearch]         = useState('')
  const [ctxMenu, setCtxMenu]       = useState<ContextMenu | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal]   = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renamingId) renameRef.current?.select()
  }, [renamingId])

  const filtered = boards.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  function openCtxMenu(e: React.MouseEvent, id: string) {
    e.preventDefault(); e.stopPropagation()
    setCtxMenu({ id, x: e.clientX, y: e.clientY })
  }

  function startRename(id: string, currentName: string) {
    setCtxMenu(null)
    setRenamingId(id)
    setRenameVal(currentName)
  }

  function commitRename(id: string) {
    const trimmed = renameVal.trim()
    if (trimmed) onRename(id, trimmed)
    setRenamingId(null)
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <div
      className="w-56 h-full flex flex-col border-r border-border bg-surface flex-shrink-0"
      onClick={() => setCtxMenu(null)}
    >
      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search boards…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="no-drag w-full pl-6 pr-2 py-1 bg-bg border border-border rounded-md text-[11.7px] text-text-primary placeholder-text-muted outline-none focus:border-accent/40 transition-colors"
          />
        </div>
      </div>

      {/* Board list */}
      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-[11.7px] text-text-muted text-center">
            {search ? 'No boards match' : 'No boards yet'}
          </div>
        ) : (
          filtered.map(board => (
            <div
              key={board.id}
              onClick={() => onSelect(board.id)}
              onContextMenu={e => openCtxMenu(e, board.id)}
              className={`group relative flex flex-col px-3 py-2 cursor-pointer transition-colors ${
                board.id === activeBoardId
                  ? 'bg-accent/10 border-l-2 border-accent'
                  : 'hover:bg-white/[0.03] border-l-2 border-transparent'
              }`}
            >
              {renamingId === board.id ? (
                <input
                  ref={renameRef}
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={() => commitRename(board.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename(board.id)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  onClick={e => e.stopPropagation()}
                  className="no-drag w-full bg-bg border border-accent/40 rounded px-1.5 py-0.5 text-[12.7px] text-text-primary outline-none"
                />
              ) : (
                <>
                  <span className={`text-[12.7px] font-medium truncate ${board.id === activeBoardId ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary transition-colors'}`}>
                    {board.name}
                  </span>
                  <span className="text-[11.7px] text-text-muted mt-0.5">
                    {board.nodeCount} node{board.nodeCount !== 1 ? 's' : ''} · {formatDate(board.updatedAt)}
                  </span>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* New board button */}
      <div className="border-t border-border p-2">
        <button
          onClick={onCreate}
          className="no-drag w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12.7px] text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Board
        </button>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[140px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { startRename(ctxMenu.id, boards.find(b => b.id === ctxMenu.id)?.name ?? '') }}
            className="w-full px-3 py-1.5 text-left text-[12.7px] text-text-secondary hover:text-text-primary hover:bg-white/[0.05] transition-colors"
          >
            Rename
          </button>
          <div className="border-t border-border my-1" />
          <button
            onClick={() => { onDelete(ctxMenu.id); setCtxMenu(null) }}
            className="w-full px-3 py-1.5 text-left text-[12.7px] text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Delete Board
          </button>
        </div>
      )}
    </div>
  )
}
