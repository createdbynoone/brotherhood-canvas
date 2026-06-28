import { memo, useRef, useState, useEffect } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { MediaNodeData } from '../../types'
import NodeShell from './NodeShell'

function VideoNode({ data, selected, width, height, id }: NodeProps & { data: MediaNodeData; width?: number; height?: number }) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const [playing,   setPlaying]   = useState(false)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const url = window.canvas.files.localUrl(data.filePath)

  // Extract first frame as poster image so we never show a black screen
  useEffect(() => {
    let cancelled = false
    const v = document.createElement('video')
    v.preload = 'auto'
    v.muted   = true
    v.src     = url

    v.addEventListener('loadeddata', () => {
      if (!cancelled) v.currentTime = 0.05
    })
    v.addEventListener('seeked', () => {
      if (cancelled) return
      try {
        const canvas = document.createElement('canvas')
        canvas.width  = v.videoWidth  || 320
        canvas.height = v.videoHeight || 240
        canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height)
        setThumbnail(canvas.toDataURL('image/jpeg', 0.82))
      } catch { /* tainted canvas — leave thumbnail null */ }
      v.src = ''
    })
    v.load()
    return () => { cancelled = true; v.src = '' }
  }, [url])

  const innerStyle: React.CSSProperties = {
    background:   data.nodeStyle?.backgroundColor ?? '#0c0c0c',
    borderColor:  data.nodeStyle?.borderColor ?? (selected ? '#E8B547' : '#242424'),
    borderWidth:  data.nodeStyle?.borderWidth ?? 1,
    borderStyle:  'solid',
    borderRadius: data.nodeStyle?.borderRadius ?? 8,
    opacity:      data.nodeStyle?.opacity ?? 1,
  }

  function openFullscreen() {
    window.dispatchEvent(new CustomEvent('canvas:preview', {
      detail: { url, type: 'video', fileName: data.fileName }
    }))
  }

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    if (playing) { v.pause(); setPlaying(false) }
    else         { v.play();  setPlaying(true)  }
  }

  return (
    <NodeShell id={id} selected={selected} width={width ?? 280} height={height ?? 200}
      minWidth={160} minHeight={120} innerStyle={innerStyle} innerClassName="flex flex-col">

      <div className="relative flex-1 bg-black overflow-hidden">
        {/*
          pointer-events: none — video element must NOT capture mouse events.
          Without this, <video> intercepts mousedown and React Flow can't
          initiate node drag from the video area.
        */}
        <video
          ref={videoRef}
          src={url}
          poster={thumbnail ?? undefined}
          className="w-full h-full object-contain"
          style={{ pointerEvents: 'none', display: 'block' }}
          onEnded={() => setPlaying(false)}
          preload="none"
        />

        {/*
          Single overlay handles all interaction.
          nodrag nopan: clicks here don't trigger React Flow drag (drag the
          node by its border/label/resize handle instead).
          Single click = play/pause. Double click = fullscreen lightbox.
        */}
        <div
          className="absolute inset-0 nodrag nopan flex items-center justify-center"
          onClick={togglePlay}
          onDoubleClick={e => { e.stopPropagation(); openFullscreen() }}
        >
          {!playing && (
            <div
              className="w-11 h-11 rounded-full bg-white/22 hover:bg-white/32 backdrop-blur-sm flex items-center justify-center transition-colors"
              style={{ pointerEvents: 'none' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            </div>
          )}
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

export default memo(VideoNode)
