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
}

export default function ContextMenu({
  menu, onClose, onDelete, onDuplicate, onEditLabel, onBringToFront, onSendToBack, onOpenStyle
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Flip menu if too close to bottom/right
  const style: React.CSSProperties = {
    position: 'fixed',
    left: menu.x,
    top: menu.y,
    zIndex: 9999,
  }

  function item(label: string, onClick: () => void, danger = false) {
    return (
      <button
        key={label}
        onClick={() => { onClick(); onClose() }}
        className={`w-full px-3 py-1.5 text-left text-[12.7px] transition-colors hover:bg-white/[0.05] ${
          danger ? 'text-red-400 hover:bg-red-500/10' : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <div
      ref={ref}
      style={style}
      className="bg-surface border border-border rounded-xl shadow-2xl py-1.5 min-w-[160px]"
    >
      {item('Edit Label', () => onEditLabel(menu.nodeId))}
      {item('Style', () => onOpenStyle(menu.nodeId))}
      <div className="border-t border-border/60 my-1" />
      {item('Duplicate', () => onDuplicate(menu.nodeId))}
      {item('Bring to Front', () => onBringToFront(menu.nodeId))}
      {item('Send to Back', () => onSendToBack(menu.nodeId))}
      <div className="border-t border-border/60 my-1" />
      {item('Delete', () => onDelete(menu.nodeId), true)}
    </div>
  )
}
