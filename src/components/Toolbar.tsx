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

const BG_OPTIONS: { value: BackgroundType; label: string; name: string; desc: string }[] = [
  { value: 'dots',  label: '·', name: 'Dots',  desc: 'Dot grid background' },
  { value: 'lines', label: '╌', name: 'Lines', desc: 'Line grid background' },
  { value: 'cross', label: '+', name: 'Cross', desc: 'Cross grid background' },
  { value: 'none',  label: '○', name: 'None',  desc: 'Plain background' },
]

export default function Toolbar({
  tool, background, onToolChange, onBackgroundChange,
  onAddTitle, onAddNote, onAddText, zoom, onZoomIn, onZoomOut, onZoomFit,
}: Props) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 bg-surface/90 backdrop-blur-md border border-border rounded-xl px-2 py-1.5 shadow-xl no-drag">

      {/* Select */}
      <Tip name="Select" desc="Select and move nodes" shortcut="V">
        <ToolBtn active={tool === 'select'} onClick={() => onToolChange('select')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={tool === 'select' ? '#E8B547' : 'currentColor'}>
            <path d="M4 3l16 9-8 2-4 9L4 3z" />
          </svg>
        </ToolBtn>
      </Tip>

      {/* Pan */}
      <Tip name="Pan" desc="Drag to move around the canvas" shortcut="H">
        <ToolBtn active={tool === 'pan'} onClick={() => onToolChange('pan')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tool === 'pan' ? '#E8B547' : 'currentColor'} strokeWidth="1.5">
            <path d="M18 11V8a2 2 0 00-4 0v3M14 11V7a2 2 0 00-4 0v4M10 11V9a2 2 0 00-4 0v5a7 7 0 007 7h1a6 6 0 006-6v-2a2 2 0 00-4 0" />
          </svg>
        </ToolBtn>
      </Tip>

      <Divider />

      {/* Add Title */}
      <Tip name="Title" desc="Add a large heading" shortcut="T">
        <ToolBtn onClick={onAddTitle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 6h16M12 6v13M8 19h8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </ToolBtn>
      </Tip>

      {/* Add Note */}
      <Tip name="Note" desc="Add a colored sticky note">
        <ToolBtn onClick={onAddNote}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="12" y1="8" x2="12" y2="16" />
          </svg>
        </ToolBtn>
      </Tip>

      {/* Add Text */}
      <Tip name="Text" desc="Add a plain text block">
        <ToolBtn onClick={onAddText}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 6h16M4 12h10M4 18h16" />
          </svg>
        </ToolBtn>
      </Tip>

      <Divider />

      {/* Background toggle */}
      <div className="flex gap-0.5">
        {BG_OPTIONS.map(opt => (
          <Tip key={opt.value} name={opt.name} desc={opt.desc}>
            <button
              onClick={() => onBackgroundChange(opt.value)}
              className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all active:scale-[0.92] font-mono ${
                background === opt.value
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]'
              }`}
            >
              {opt.label}
            </button>
          </Tip>
        ))}
      </div>

      <Divider />

      {/* Zoom */}
      <Tip name="Zoom out" desc="Reduce canvas zoom" shortcut="−">
        <ToolBtn onClick={onZoomOut}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </ToolBtn>
      </Tip>

      <Tip name="Fit view" desc="Center all nodes in view" shortcut="F">
        <button
          onClick={onZoomFit}
          className="px-1.5 h-7 font-mono text-[11px] text-text-secondary hover:text-text-primary transition-colors min-w-[42px] text-center tabular-nums"
        >
          {Math.round(zoom * 100)}%
        </button>
      </Tip>

      <Tip name="Zoom in" desc="Increase canvas zoom" shortcut="+">
        <ToolBtn onClick={onZoomIn}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </ToolBtn>
      </Tip>
    </div>
  )
}

// ─── Floating tooltip — appears below the button after a short hover delay ────
function Tip({ name, desc, shortcut, children }: {
  name: string; desc: string; shortcut?: string; children: React.ReactNode
}) {
  return (
    <div className="relative group/tip flex">
      {children}
      <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2.5 z-50 opacity-0 translate-y-1 group-hover/tip:opacity-100 group-hover/tip:translate-y-0 transition-all duration-150 delay-0 group-hover/tip:delay-[400ms]">
        <div className="flex flex-col items-center gap-0.5 bg-surface border border-border rounded-lg shadow-2xl px-2.5 py-1.5 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="font-heading font-semibold text-[11px] text-text-primary">{name}</span>
            {shortcut && (
              <span className="font-mono text-[9.5px] text-text-muted border border-border rounded px-1 py-px leading-none">{shortcut}</span>
            )}
          </div>
          <span className="text-[10.5px] text-text-secondary">{desc}</span>
        </div>
      </div>
    </div>
  )
}

function ToolBtn({ children, active, onClick }: {
  children: React.ReactNode; active?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-[0.92] ${
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
