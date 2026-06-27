import type { BackgroundType } from '../types'

type Tool = 'select' | 'pan'

interface Props {
  tool: Tool
  background: BackgroundType
  onToolChange: (t: Tool) => void
  onBackgroundChange: (b: BackgroundType) => void
  onAddTitle: () => void
  onAddNote: () => void
  onAddText: () => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomFit: () => void
}

const BG_OPTIONS: { value: BackgroundType; label: string }[] = [
  { value: 'dots', label: '·' },
  { value: 'lines', label: '╌' },
  { value: 'cross', label: '+' },
  { value: 'none', label: '○' },
]

export default function Toolbar({
  tool, background, onToolChange, onBackgroundChange,
  onAddTitle, onAddNote, onAddText, zoom, onZoomIn, onZoomOut, onZoomFit,
}: Props) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 bg-surface border border-border rounded-xl px-2 py-1.5 shadow-xl no-drag">

      {/* Select */}
      <ToolBtn
        active={tool === 'select'}
        onClick={() => onToolChange('select')}
        title="Select (V)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={tool === 'select' ? '#E8B547' : 'currentColor'}>
          <path d="M4 3l16 9-8 2-4 9L4 3z" />
        </svg>
      </ToolBtn>

      {/* Pan */}
      <ToolBtn
        active={tool === 'pan'}
        onClick={() => onToolChange('pan')}
        title="Pan (H)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tool === 'pan' ? '#E8B547' : 'currentColor'} strokeWidth="1.5">
          <path d="M18 11V8a2 2 0 00-4 0v3M14 11V7a2 2 0 00-4 0v4M10 11V9a2 2 0 00-4 0v5a7 7 0 007 7h1a6 6 0 006-6v-2a2 2 0 00-4 0" />
        </svg>
      </ToolBtn>

      <Divider />

      {/* Add Title */}
      <ToolBtn onClick={onAddTitle} title="Add Title (T)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 6h16M12 6v13M8 19h8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </ToolBtn>

      {/* Add Note */}
      <ToolBtn onClick={onAddNote} title="Add Note">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="12" y1="8" x2="12" y2="16" />
        </svg>
      </ToolBtn>

      {/* Add Text */}
      <ToolBtn onClick={onAddText} title="Add Text">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 6h16M4 12h10M4 18h16" />
        </svg>
      </ToolBtn>

      <Divider />

      {/* Background toggle */}
      <div className="flex gap-0.5">
        {BG_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onBackgroundChange(opt.value)}
            title={`Background: ${opt.value}`}
            className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-colors font-mono ${
              background === opt.value
                ? 'bg-accent/15 text-accent'
                : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Divider />

      {/* Zoom */}
      <ToolBtn onClick={onZoomOut} title="Zoom out (−)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </ToolBtn>

      <button
        onClick={onZoomFit}
        className="px-1.5 h-7 font-mono text-[11px] text-text-secondary hover:text-text-primary transition-colors min-w-[42px] text-center tabular-nums"
        title="Fit view (F)"
      >
        {Math.round(zoom * 100)}%
      </button>

      <ToolBtn onClick={onZoomIn} title="Zoom in (+)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </ToolBtn>
    </div>
  )
}

function ToolBtn({ children, active, onClick, title }: {
  children: React.ReactNode; active?: boolean; onClick: () => void; title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
        active
          ? 'bg-accent/15 text-accent'
          : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-1" />
}
