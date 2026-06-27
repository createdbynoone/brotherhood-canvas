import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { useReactFlow, type NodeProps } from '@xyflow/react'
import type { TextNodeData } from '../../types'
import NodeShell from './NodeShell'

function TextNode({ data, selected, width, height, id }: NodeProps & { data: TextNodeData; width?: number; height?: number }) {
  const { updateNodeData } = useReactFlow()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(data.content ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (!editing) setDraft(data.content ?? '') }, [data.content, editing])
  useEffect(() => { if (editing) textareaRef.current?.focus() }, [editing])

  const commitEdit = useCallback(() => {
    setEditing(false)
    updateNodeData(id, { content: draft })
  }, [id, draft, updateNodeData])

  const innerStyle: React.CSSProperties = {
    background:   data.nodeStyle?.backgroundColor ?? '#141414',
    borderColor:  data.nodeStyle?.borderColor ?? (selected ? '#E8B547' : '#242424'),
    borderWidth:  data.nodeStyle?.borderWidth ?? 1,
    borderStyle:  'solid',
    borderRadius: data.nodeStyle?.borderRadius ?? 8,
    opacity:      data.nodeStyle?.opacity ?? 1,
  }

  return (
    <NodeShell id={id} selected={selected} width={width ?? 260} height={height ?? 180}
      minWidth={120} minHeight={80} innerStyle={innerStyle} innerClassName="flex flex-col">

      {data.label && (
        <div className="px-3 py-1.5 text-[10.7px] font-heading font-semibold uppercase tracking-widest text-text-muted border-b border-white/5 flex-shrink-0 truncate">
          {data.label}
        </div>
      )}

      <div className="flex-1 overflow-hidden" onDoubleClick={() => setEditing(true)}>
        {editing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              e.stopPropagation()
              if (e.key === 'Escape') commitEdit()
            }}
            className="nodrag nopan nowheel w-full h-full resize-none bg-transparent px-3 py-2 text-[13.7px] text-text-primary outline-none font-heading leading-relaxed"
            spellCheck={false}
          />
        ) : (
          <div className="w-full h-full px-3 py-2 text-[13.7px] text-text-primary font-heading leading-relaxed whitespace-pre-wrap overflow-hidden cursor-text">
            {data.content || (
              <span className="text-text-muted italic text-[12.7px]">Double-click to edit…</span>
            )}
          </div>
        )}
      </div>
    </NodeShell>
  )
}

export default memo(TextNode)
