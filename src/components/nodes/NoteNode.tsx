import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react'
import type { NoteNodeData } from '../../types'

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

  const bgColor = noteColor + '12'    // 7% opacity
  const bdColor = noteColor + '38'    // 22% opacity

  const style: React.CSSProperties = {
    background:   data.nodeStyle?.backgroundColor ?? bgColor,
    borderColor:  data.nodeStyle?.borderColor ?? (selected ? noteColor : bdColor),
    borderWidth:  data.nodeStyle?.borderWidth ?? 1,
    borderStyle:  'solid',
    borderRadius: data.nodeStyle?.borderRadius ?? 10,
    opacity:      data.nodeStyle?.opacity ?? 1,
    width:  width  ?? 220,
    height: height ?? 180,
  }

  return (
    <div className="relative flex flex-col overflow-hidden" style={style}>
      <NodeResizer minWidth={140} minHeight={100} isVisible={selected} />

      <Handle type="source" position={Position.Top}    id="s-top"    style={{ left: '50%', top: -5 }} />
      <Handle type="source" position={Position.Right}  id="s-right"  style={{ right: -5, top: '50%' }} />
      <Handle type="source" position={Position.Bottom} id="s-bottom" style={{ left: '50%', bottom: -5 }} />
      <Handle type="source" position={Position.Left}   id="s-left"   style={{ left: -5, top: '50%' }} />
      <Handle type="target" position={Position.Top}    id="t-top"    style={{ left: '30%', top: -5 }} />
      <Handle type="target" position={Position.Bottom} id="t-bottom" style={{ left: '30%', bottom: -5 }} />

      {/* Color accent strip at top */}
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
    </div>
  )
}

export default memo(NoteNode)
