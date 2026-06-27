import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react'

interface NodeShellProps {
  id: string
  selected: boolean
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  children: React.ReactNode
  innerStyle?: React.CSSProperties
  innerClassName?: string
}

export default function NodeShell({
  id, selected, width, height,
  minWidth = 100, minHeight = 80,
  children, innerStyle, innerClassName = '',
}: NodeShellProps) {
  const { getEdges, deleteElements } = useReactFlow()

  function disconnectAll(e: React.MouseEvent) {
    e.stopPropagation()
    const connected = getEdges().filter(edge => edge.source === id || edge.target === id)
    deleteElements({ edges: connected })
  }

  return (
    <div style={{ width, height, position: 'relative' }}>
      <NodeResizer minWidth={minWidth} minHeight={minHeight} isVisible={selected} />

      <Handle type="source" position={Position.Top}    id="top"    />
      <Handle type="source" position={Position.Right}  id="right"  />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left}   id="left"   />

      <div className={`absolute inset-0 overflow-hidden ${innerClassName}`} style={innerStyle}>
        {children}
      </div>

      <button
        className="node-scissors absolute -top-3 -right-3 w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center opacity-0 transition-opacity hover:border-accent/50 hover:text-accent nodrag nopan"
        style={{ zIndex: 20 }}
        onClick={disconnectAll}
        title="Disconnect all"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3"/>
          <circle cx="6" cy="18" r="3"/>
          <line x1="20" y1="4" x2="8.12" y2="15.88"/>
          <line x1="14.47" y1="14.48" x2="20" y2="20"/>
          <line x1="8.12" y1="8.12" x2="12" y2="12"/>
        </svg>
      </button>
    </div>
  )
}
