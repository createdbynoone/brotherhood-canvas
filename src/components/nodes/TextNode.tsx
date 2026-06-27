import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react'
import type { TextNodeData } from '../../types'

function TextNode({ data, selected, width, height, id }: NodeProps & { data: TextNodeData; width?: number; height?: number }) {
  const { updateNodeData } = useReactFlow()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(data.content ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync draft if data.content changes from outside (e.g. undo)
  useEffect(() => { if (!editing) setDraft(data.content ?? '') }, [data.content, editing])
  useEffect(() => { if (editing) textareaRef.current?.focus() }, [editing])

  const commitEdit = useCallback(() => {
    setEditing(false)
    updateNodeData(id, { content: draft })
  }, [id, draft, updateNodeData])

  const style: React.CSSProperties = {
    background: data.nodeStyle?.backgroundColor ?? '#141414',
    borderColor: data.nodeStyle?.borderColor ?? (selected ? '#E8B547' : '#242424'),
    borderWidth: data.nodeStyle?.borderWidth ?? 1,
    borderStyle: 'solid',
    borderRadius: data.nodeStyle?.borderRadius ?? 8,
    opacity: data.nodeStyle?.opacity ?? 1,
    width: width ?? 260,
    height: height ?? 180,
  }

  return (
    <div className="relative flex flex-col overflow-hidden" style={style}>
      <NodeResizer minWidth={120} minHeight={80} isVisible={selected} />

      <Handle type="source" position={Position.Top}    id="s-top"    style={{ left: '50%', top: -5 }} />
      <Handle type="source" position={Position.Right}  id="s-right"  style={{ right: -5, top: '50%' }} />
      <Handle type="source" position={Position.Bottom} id="s-bottom" style={{ left: '50%', bottom: -5 }} />
      <Handle type="source" position={Position.Left}   id="s-left"   style={{ left: -5, top: '50%' }} />
      <Handle type="target" position={Position.Top}    id="t-top"    style={{ left: '30%', top: -5 }} />
      <Handle type="target" position={Position.Bottom} id="t-bottom" style={{ left: '30%', bottom: -5 }} />

      {data.label && (
        <div className="px-3 py-1.5 text-[11.7px] font-medium text-text-muted border-b border-white/5 flex-shrink-0 truncate">
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
            className="nodrag nopan nowheel w-full h-full resize-none bg-transparent px-3 py-2 text-[13.7px] text-text-primary outline-none font-mono leading-relaxed"
            spellCheck={false}
          />
        ) : (
          <div className="w-full h-full px-3 py-2 text-[13.7px] text-text-primary font-mono leading-relaxed whitespace-pre-wrap overflow-hidden cursor-text">
            {data.content || (
              <span className="text-text-muted italic text-[12.7px]">Double-click to edit…</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(TextNode)
