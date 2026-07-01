import { useEffect, useRef } from 'react'
import type { ContextMenuState } from '../types'

interface Props {
  menu: ContextMenuState
  onClose: () => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onEditLabel: (id: string) => void
  onBringToFront: (id: string) => void
  onSendToBack: (id: string) => void
  onOpenStyle: (id: string) => void
  onCopy: (id: string) => void
  onPaste: () => void
  onShowInFinder?: (id: string) => void
}

export default function ContextMenu({
  menu, onClose, onDelete, onDuplicate, onEditLabel, onBringToFront, onSendToBack,
  onOpenStyle, onCopy, onPaste, onShowInFinder,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const MENU_W = 176, MENU_H = 320
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(menu.x, window.innerWidth - MENU_W - 8),
    top: Math.min(menu.y, window.innerHeight - MENU_H - 8),
    zIndex: 9999,
  }

  function item(label: string, onClick: () => void, opts?: { danger?: boolean; shortcut?: string }) {
    return (
      <button
        key={label}
        onClick={() => { onClick(); onClose() }}
        className={`w-full px-3 py-1.5 flex items-center justify-between gap-4 text-left text-[12.7px] transition-colors hover:bg-white/[0.05] ${
          opts?.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        <span>{label}</span>
        {opts?.shortcut && (
          <span className="font-mono text-[10px] text-text-muted tracking-wider">{opts.shortcut}</span>
        )}
      </button>
    )
  }

  const isMedia = menu.nodeType === 'image' || menu.nodeType === 'video'

  return (
    <div
      ref={ref}
      style={style}
      className="animate-menu-in bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-2xl py-1.5 min-w-[176px]"
    >
      {item('Edit Label', () => onEditLabel(menu.nodeId))}
      {item('Style', () => onOpenStyle(menu.nodeId))}
      <div className="border-t border-border/60 my-1" />
      {item('Copy', () => onCopy(menu.nodeId), { shortcut: '⌘C' })}
      {item('Paste', () => onPaste(), { shortcut: '⌘V' })}
      {item('Duplicate', () => onDuplicate(menu.nodeId), { shortcut: '⌘D' })}
      <div className="border-t border-border/60 my-1" />
      {item('Bring to Front', () => onBringToFront(menu.nodeId))}
      {item('Send to Back', () => onSendToBack(menu.nodeId))}
      {isMedia && onShowInFinder && (
        <>
          <div className="border-t border-border/60 my-1" />
          {item('Show in Finder', () => onShowInFinder(menu.nodeId))}
        </>
      )}
      <div className="border-t border-border/60 my-1" />
      {item('Delete', () => onDelete(menu.nodeId), { danger: true, shortcut: '⌫' })}
    </div>
  )
}
