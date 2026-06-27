import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { MediaNodeData } from '../../types'
import NodeShell from './NodeShell'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function PDFNode({ data, selected, width, height, id }: NodeProps & { data: MediaNodeData; width?: number; height?: number }) {
  const innerStyle: React.CSSProperties = {
    background:   data.nodeStyle?.backgroundColor ?? '#141414',
    borderColor:  data.nodeStyle?.borderColor ?? (selected ? '#E8B547' : '#242424'),
    borderWidth:  data.nodeStyle?.borderWidth ?? 1,
    borderStyle:  'solid',
    borderRadius: data.nodeStyle?.borderRadius ?? 8,
    opacity:      data.nodeStyle?.opacity ?? 1,
  }

  return (
    <NodeShell id={id} selected={selected} width={width ?? 200} height={height ?? 220}
      minWidth={140} minHeight={160} innerStyle={innerStyle} innerClassName="flex flex-col">

      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 p-4 cursor-pointer group"
        onDoubleClick={() => window.canvas.files.openExternal(data.filePath)}
      >
        <div className="relative">
          <svg width="56" height="72" viewBox="0 0 56 72" fill="none">
            <rect width="56" height="72" rx="4" fill="#1a1a1a" />
            <path d="M36 0v16h16L36 0z" fill="#242424" />
            <path d="M36 0v16h16" fill="none" stroke="#303030" strokeWidth="1" />
            <text x="8" y="52" fontFamily="Inter,sans-serif" fontWeight="700" fontSize="13" fill="#E8B547" letterSpacing="0.5">PDF</text>
          </svg>
        </div>

        <div className="text-center">
          <p className="text-[12.7px] text-text-primary font-medium line-clamp-2 leading-tight">
            {data.fileName}
          </p>
          <p className="text-[11.7px] text-text-muted mt-1">{formatSize(data.fileSize)}</p>
        </div>

        <div className="flex items-center gap-1 text-[11.7px] text-text-muted group-hover:text-accent transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
          Double-click to open
        </div>
      </div>

      {data.label && (
        <div className="px-2 py-1 text-[10.7px] font-heading font-semibold uppercase tracking-widest text-text-secondary truncate border-t border-border/50 flex-shrink-0">
          {data.label}
        </div>
      )}
    </NodeShell>
  )
}

export default memo(PDFNode)
