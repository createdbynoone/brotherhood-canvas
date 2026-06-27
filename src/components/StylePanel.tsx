import { useState, useEffect } from 'react'
import type { NodeStyle } from '../types'

interface Props {
  nodeId: string | null
  initialStyle?: NodeStyle
  nodeType?: string
  nodeLabel?: string
  noteColor?: string
  onClose: () => void
  onChange: (nodeId: string, style: Partial<NodeStyle>, label?: string, noteColor?: string) => void
}

const PRESETS = [
  { bg: '#141414', border: '#E8B547', label: 'Accent' },
  { bg: '#1a1a2e', border: '#4B8EFF', label: 'Blue' },
  { bg: '#1a2e1a', border: '#8AE05A', label: 'Green' },
  { bg: '#2e1a1a', border: '#E05A5A', label: 'Red' },
  { bg: '#141414', border: '#242424', label: 'Dark' },
  { bg: 'transparent', border: '#242424', label: 'Ghost' },
]

const NOTE_COLORS = ['#E8B547', '#4B8EFF', '#8AE05A', '#E05A5A', '#9B8AE0', '#5AC8E0', '#F0EBE0']

export default function StylePanel({ nodeId, initialStyle, nodeType, nodeLabel, noteColor, onClose, onChange }: Props) {
  const [style, setStyle]   = useState<NodeStyle>(initialStyle ?? {})
  const [label, setLabel]   = useState(nodeLabel ?? '')
  const [nColor, setNColor] = useState(noteColor ?? '#E8B547')

  useEffect(() => { setStyle(initialStyle ?? {}) }, [nodeId])
  useEffect(() => { setLabel(nodeLabel ?? '') }, [nodeLabel])
  useEffect(() => { setNColor(noteColor ?? '#E8B547') }, [noteColor])

  if (!nodeId) return null

  function update(partial: Partial<NodeStyle>) {
    const next = { ...style, ...partial }
    setStyle(next)
    onChange(nodeId!, next, label, nColor)
  }

  function commitLabel() {
    onChange(nodeId!, style, label, nColor)
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    const next = { ...style, backgroundColor: preset.bg, borderColor: preset.border }
    setStyle(next)
    onChange(nodeId!, next, label, nColor)
  }

  return (
    <div
      className="absolute right-3 top-3 z-40 w-52 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[11.7px] font-semibold text-text-secondary uppercase tracking-wider">Style</span>
        <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors text-xs">✕</button>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Label */}
        <div>
          <label className="text-[11.7px] text-text-muted block mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={e => { if (e.key === 'Enter') commitLabel() }}
            placeholder="Node label…"
            className="nodrag w-full px-2 py-1 bg-bg border border-border rounded-md text-[12.7px] text-text-primary outline-none focus:border-accent/40 transition-colors"
          />
        </div>

        {/* Presets */}
        <div>
          <label className="text-[11.7px] text-text-muted block mb-1.5">Presets</label>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="h-7 rounded-md border text-[10px] text-text-muted hover:text-text-primary transition-colors"
                style={{ background: p.bg, borderColor: p.border }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note color (only for note nodes) */}
        {nodeType === 'note' && (
          <div>
            <label className="text-[11.7px] text-text-muted block mb-1.5">Note Color</label>
            <div className="flex gap-1.5 flex-wrap">
              {NOTE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setNColor(c); onChange(nodeId!, style, label, c) }}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    background: c,
                    borderColor: c === nColor ? '#F0EBE0' : 'transparent',
                    transform: c === nColor ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Background color */}
        <div className="flex items-center justify-between">
          <label className="text-[11.7px] text-text-muted">Background</label>
          <input
            type="color"
            value={style.backgroundColor ?? '#141414'}
            onChange={e => update({ backgroundColor: e.target.value })}
            className="nodrag w-7 h-7 rounded cursor-pointer border border-border bg-transparent"
          />
        </div>

        {/* Border color */}
        <div className="flex items-center justify-between">
          <label className="text-[11.7px] text-text-muted">Border Color</label>
          <input
            type="color"
            value={style.borderColor ?? '#242424'}
            onChange={e => update({ borderColor: e.target.value })}
            className="nodrag w-7 h-7 rounded cursor-pointer border border-border bg-transparent"
          />
        </div>

        {/* Border width */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11.7px] text-text-muted">Border Width</label>
            <span className="text-[11.7px] text-text-secondary">{style.borderWidth ?? 1}px</span>
          </div>
          <input
            type="range" min={0} max={6} step={1}
            value={style.borderWidth ?? 1}
            onChange={e => update({ borderWidth: Number(e.target.value) })}
            className="nodrag w-full accent-accent h-1"
          />
        </div>

        {/* Border radius */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11.7px] text-text-muted">Corner Radius</label>
            <span className="text-[11.7px] text-text-secondary">{style.borderRadius ?? 8}px</span>
          </div>
          <input
            type="range" min={0} max={32} step={2}
            value={style.borderRadius ?? 8}
            onChange={e => update({ borderRadius: Number(e.target.value) })}
            className="nodrag w-full accent-accent h-1"
          />
        </div>

        {/* Opacity */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11.7px] text-text-muted">Opacity</label>
            <span className="text-[11.7px] text-text-secondary">{Math.round((style.opacity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range" min={0.1} max={1} step={0.05}
            value={style.opacity ?? 1}
            onChange={e => update({ opacity: Number(e.target.value) })}
            className="nodrag w-full accent-accent h-1"
          />
        </div>
      </div>
    </div>
  )
}
