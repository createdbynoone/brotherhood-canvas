import { memo, useState } from 'react'
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import type { MediaNodeData } from '../../types'

function ImageNode({ data, selected, width, height }: NodeProps & { data: MediaNodeData; width?: number; height?: number }) {
  const [imgError, setImgError] = useState(false)
  const url = window.canvas.files.localUrl(data.filePath)

  const style: React.CSSProperties = {
    background: data.nodeStyle?.backgroundColor ?? 'transparent',
    borderColor: data.nodeStyle?.borderColor ?? (selected ? '#E8B547' : '#242424'),
    borderWidth: data.nodeStyle?.borderWidth ?? 1,
    borderStyle: 'solid',
    borderRadius: data.nodeStyle?.borderRadius ?? 8,
    opacity: data.nodeStyle?.opacity ?? 1,
    width: width ?? 240,
    height: height ?? 200,
  }

  return (
    <div className="relative flex flex-col overflow-hidden" style={style}>
      <NodeResizer minWidth={100} minHeight={80} isVisible={selected} />

      {/* Handles — all 4 sides */}
      <Handle type="source" position={Position.Top}    id="top"    style={{ left: '50%', top: -5 }} />
      <Handle type="source" position={Position.Right}  id="right"  style={{ right: -5, top: '50%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ left: '50%', bottom: -5 }} />
      <Handle type="source" position={Position.Left}   id="left"   style={{ left: -5, top: '50%' }} />
      <Handle type="target" position={Position.Top}    id="t-top"    style={{ left: '30%', top: -5 }} />
      <Handle type="target" position={Position.Right}  id="t-right"  style={{ right: -5, top: '30%' }} />
      <Handle type="target" position={Position.Bottom} id="t-bottom" style={{ left: '30%', bottom: -5 }} />
      <Handle type="target" position={Position.Left}   id="t-left"   style={{ left: -5, top: '30%' }} />

      {/* Image */}
      <div className="flex-1 overflow-hidden">
        {imgError ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-text-muted bg-surface">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="text-[10px]">{data.fileName}</span>
          </div>
        ) : (
          <img
            src={url}
            alt={data.fileName}
            onError={() => setImgError(true)}
            onDoubleClick={() => window.dispatchEvent(new CustomEvent('canvas:preview', {
              detail: { url, type: 'image', fileName: data.fileName }
            }))}
            draggable={false}
            className="w-full h-full object-cover cursor-zoom-in"
          />
        )}
      </div>

      {/* Label */}
      {data.label && (
        <div className="px-2 py-1 text-[11.7px] text-text-secondary truncate border-t border-border/50 bg-bg/80 backdrop-blur-sm flex-shrink-0">
          {data.label}
        </div>
      )}
    </div>
  )
}

export default memo(ImageNode)
