import { memo, useRef, useState } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { MediaNodeData } from '../../types'
import NodeShell from './NodeShell'

function VideoNode({ data, selected, width, height, id }: NodeProps & { data: MediaNodeData; width?: number; height?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const url = window.canvas.files.localUrl(data.filePath)

  const innerStyle: React.CSSProperties = {
    background:   data.nodeStyle?.backgroundColor ?? '#0c0c0c',
    borderColor:  data.nodeStyle?.borderColor ?? (selected ? '#E8B547' : '#242424'),
    borderWidth:  data.nodeStyle?.borderWidth ?? 1,
    borderStyle:  'solid',
    borderRadius: data.nodeStyle?.borderRadius ?? 8,
    opacity:      data.nodeStyle?.opacity ?? 1,
  }

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation()
    if (!videoRef.current) return
    if (playing) { videoRef.current.pause(); setPlaying(false) }
    else { videoRef.current.play(); setPlaying(true) }
  }

  return (
    <NodeShell id={id} selected={selected} width={width ?? 280} height={height ?? 200}
      minWidth={160} minHeight={120} innerStyle={innerStyle} innerClassName="flex flex-col">

      <div
        className="relative flex-1 overflow-hidden bg-black"
        onDoubleClick={() => window.dispatchEvent(new CustomEvent('canvas:preview', {
          detail: { url, type: 'video', fileName: data.fileName }
        }))}
      >
        <video
          ref={videoRef}
          src={url}
          className="w-full h-full object-contain"
          onEnded={() => setPlaying(false)}
          draggable={false}
        />
        {!playing && (
          <button
            onClick={e => { e.stopPropagation(); togglePlay(e) }}
            onDoubleClick={e => e.stopPropagation()}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors group nodrag nopan"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            </div>
          </button>
        )}
        {playing && (
          <button
            onClick={e => { e.stopPropagation(); togglePlay(e) }}
            onDoubleClick={e => e.stopPropagation()}
            className="absolute inset-0 nodrag nopan opacity-0"
            aria-label="Pause"
          />
        )}
      </div>

      {data.label && (
        <div className="px-2 py-1 text-[10.7px] font-heading font-semibold uppercase tracking-widest text-text-secondary truncate border-t border-border/50 flex-shrink-0">
          {data.label}
        </div>
      )}
    </NodeShell>
  )
}

export default memo(VideoNode)
