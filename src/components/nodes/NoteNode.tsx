import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { useReactFlow, type NodeProps } from '@xyflow/react'
import type { NoteNodeData } from '../../types'
import NodeShell from './NodeShell'

function NoteNode({ data, selected, width, height, id }: NodeProps & { data: NoteNodeData; width?: number; height?: number }) {
  const { updateNodeData } = useReactFlow()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(data.content ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const noteColor   = data.noteColor ?? '#E8B547'

  useEffect(() => { if (!editing) setDraft(data.content ?? '') }, [data.content, editing])
  useEffect(() => { if (editing) textareaRef.current?.focus() }, [editing])

  const commitEdit = useCallback(() => {
    setEditing(false)
    updateNodeData(id, { content: draft })
  }, [id, draft, updateNodeData])

  const bgColor = noteColor + '12'
  const bdColor = noteColor + '38'

  const innerStyle: React.CSSProperties = {
    background:   data.nodeStyle?.backgroundColor ?? bgColor,
    borderColor:  data.nodeStyle?.borderColor ?? (selected ? noteColor : bdColor),
    borderWidth:  data.nodeStyle?.borderWidth ?? 1,
    borderStyle:  'solid',
    borderRadius: data.nodeStyle?.borderRadius ?? 10,
    opacity:      data.nodeStyle?.opacity ?? 1,
  }

  return (
    <NodeShell id={id} selected={selected} width={width ?? 220} height={height ?? 180}
      minWidth={140} minHeight={100} innerStyle={innerStyle} innerClassName="flex flex-col">

      <div className="flex-shrink-0 h-[3px] rounded-t-[9px]" style={{ background: noteColor }} />

      {data.label && (
        <div className="px-3 pt-2 text-[11.7px] font-semibold truncate flex-shrink-0" style={{ color: noteColor }}>
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
            className="nodrag nopan nowheel w-full h-full resize-none bg-transparent px-3 py-2 text-[13.7px] text-text-primary outline-none leading-relaxed"
            spellCheck={false}
          />
        ) : (
          <div className="w-full h-full px-3 py-2 text-[13.7px] text-text-primary leading-relaxed whitespace-pre-wrap overflow-hidden cursor-text">
            {data.content || (
              <span className="opacity-30 italic text-[12.7px]">Double-click to write…</span>
            )}
          </div>
        )}
      </div>
    </NodeShell>
  )
}

export default memo(NoteNode)
