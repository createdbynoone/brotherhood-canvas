import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant,
  MiniMap, useNodesState, useEdgesState, useReactFlow, useViewport,
  addEdge,
  type Node, type Edge, type Connection,
} from '@xyflow/react'
import type {
  SerializedBoard, SerializedNode, SerializedEdge,
  BackgroundType, AnyNodeData, NodeStyle, ContextMenuState,
} from '../types'
import { useAutoSave } from '../hooks/useAutoSave'
import Toolbar from './Toolbar'
import ContextMenu from './ContextMenu'
import StylePanel from './StylePanel'
import ImageNode from './nodes/ImageNode'
import VideoNode from './nodes/VideoNode'
import PDFNode from './nodes/PDFNode'
import TextNode from './nodes/TextNode'
import NoteNode from './nodes/NoteNode'
import TitleNode from './nodes/TitleNode'
import CustomEdge from './edges/CustomEdge'

// ─── Node type registry ───────────────────────────────────────────────────────
const NODE_TYPES = {
  image: ImageNode,
  video: VideoNode,
  pdf: PDFNode,
  text: TextNode,
  note: NoteNode,
  title: TitleNode,
}

const EDGE_TYPES = { default: CustomEdge }

const DEFAULT_SIZES: Record<string, [number, number]> = {
  image: [240, 200],
  video: [280, 200],
  pdf: [200, 220],
  text: [260, 180],
  note: [220, 180],
}

// ─── Serialization helpers ────────────────────────────────────────────────────
function toRFNode(sn: SerializedNode): Node {
  return { id: sn.id, type: sn.type, position: sn.position, data: sn.data, width: sn.width, height: sn.height }
}
function fromRFNode(n: Node): SerializedNode {
  return { id: n.id, type: n.type ?? 'note', position: n.position, data: n.data as AnyNodeData, width: n.width, height: n.height }
}
function toRFEdge(se: SerializedEdge): Edge {
  return {
    id: se.id, source: se.source, target: se.target,
    sourceHandle: se.sourceHandle, targetHandle: se.targetHandle,
    label: se.label,
    style: se.data?.color ? { stroke: se.data.color, strokeWidth: se.data.strokeWidth ?? 1.5 } : undefined,
    animated: se.data?.animated,
  }
}
function fromRFEdge(e: Edge): SerializedEdge {
  return {
    id: e.id, source: e.source, target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    label: e.label as string | undefined,
  }
}

// ─── Inner canvas (must be inside ReactFlowProvider) ─────────────────────────
function BoardCanvasInner({ boardId, onMetaChange }: { boardId: string; onMetaChange: (id: string, n: number) => void }) {
  const { screenToFlowPosition, fitView, zoomIn, zoomOut, setViewport, getViewport } = useReactFlow()
  const { zoom } = useViewport()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [background, setBackground]   = useState<BackgroundType>('dots')
  const [tool, setTool]               = useState<'select' | 'pan'>('select')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [stylePanelId, setStylePanelId] = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(true)
  const [dropping, setDropping]       = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Stable refs for the auto-save closure
  const boardMetaRef = useRef<{ id: string; name: string; createdAt: string }>({ id: boardId, name: '', createdAt: '' })
  const nodesRef     = useRef(nodes);        nodesRef.current     = nodes
  const edgesRef     = useRef(edges);        edgesRef.current     = edges
  const bgRef        = useRef(background);   bgRef.current        = background
  const getVpRef     = useRef(getViewport);  getVpRef.current     = getViewport

  // ─── Load board ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsLoading(true)
    setContextMenu(null)
    setStylePanelId(null)
    window.canvas.boards.load(boardId).then(b => {
      boardMetaRef.current = { id: b.id, name: b.name, createdAt: b.createdAt }
      setNodes(b.nodes.map(toRFNode))
      setEdges(b.edges.map(toRFEdge))
      setBackground(b.background ?? 'dots')
      setTimeout(() => {
        if (b.viewport && (b.viewport.zoom !== 1 || b.viewport.x !== 0 || b.viewport.y !== 0)) {
          setViewport(b.viewport)
        } else if (b.nodes.length > 0) {
          fitView({ padding: 0.2, duration: 0 })
        }
        setIsLoading(false)
      }, 100)
    }).catch(() => setIsLoading(false))
  }, [boardId])

  // ─── Auto-save ───────────────────────────────────────────────────────────────
  const getBoard = useCallback((): SerializedBoard | null => {
    const meta = boardMetaRef.current
    return {
      id: meta.id, name: meta.name, createdAt: meta.createdAt,
      updatedAt: new Date().toISOString(),
      nodeCount: nodesRef.current.length,
      nodes: nodesRef.current.map(fromRFNode),
      edges: edgesRef.current.map(fromRFEdge),
      viewport: getVpRef.current(),
      background: bgRef.current,
    }
  }, [])

  const { schedulesSave } = useAutoSave(getBoard)

  useEffect(() => {
    if (isLoading) return
    schedulesSave()
    onMetaChange(boardId, nodes.length)
  }, [nodes, edges, background, isLoading])

  // ─── Connections ─────────────────────────────────────────────────────────────
  const onConnect = useCallback((params: Connection) => {
    setEdges(es => addEdge(params, es))
  }, [])

  const onPaneClick = useCallback(() => { setContextMenu(null); setStylePanelId(null) }, [])

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault()
    setContextMenu({ nodeId: node.id, x: e.clientX, y: e.clientY })
  }, [])

  // ─── Context menu actions ────────────────────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    setNodes(ns => ns.filter(n => n.id !== id))
    setEdges(es => es.filter(e => e.source !== id && e.target !== id))
  }, [])

  const handleDuplicate = useCallback((id: string) => {
    setNodes(ns => {
      const node = ns.find(n => n.id === id)
      if (!node) return ns
      return [...ns, { ...node, id: crypto.randomUUID(), position: { x: node.position.x + 30, y: node.position.y + 30 }, selected: false, data: { ...node.data } }]
    })
  }, [])

  const handleBringToFront = useCallback((id: string) => {
    setNodes(ns => { const max = Math.max(0, ...ns.map(n => n.zIndex ?? 0)); return ns.map(n => n.id === id ? { ...n, zIndex: max + 1 } : n) })
  }, [])

  const handleSendToBack = useCallback((id: string) => {
    setNodes(ns => { const min = Math.min(0, ...ns.map(n => n.zIndex ?? 0)); return ns.map(n => n.id === id ? { ...n, zIndex: min - 1 } : n) })
  }, [])

  const handleStyleChange = useCallback((nodeId: string, style: Partial<NodeStyle>, label?: string, noteColor?: string) => {
    setNodes(ns => ns.map(n => {
      if (n.id !== nodeId) return n
      const d = { ...(n.data as AnyNodeData), nodeStyle: { ...(n.data as any).nodeStyle, ...style } }
      if (label !== undefined) d.label = label
      if (noteColor !== undefined) (d as any).noteColor = noteColor
      return { ...n, data: d }
    }))
  }, [])

  // ─── Add nodes from toolbar ──────────────────────────────────────────────────
  const addTitle = useCallback(() => {
    const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    setNodes(ns => [...ns, { id: crypto.randomUUID(), type: 'title', position: { x: pos.x - 200, y: pos.y - 40 }, data: { content: '', fontSize: 32 }, width: 400, height: 80 }])
  }, [screenToFlowPosition])

  const addNote = useCallback(() => {
    const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    setNodes(ns => [...ns, { id: crypto.randomUUID(), type: 'note', position: pos, data: { content: '', noteColor: '#E8B547' }, width: 220, height: 180 }])
  }, [screenToFlowPosition])

  const addText = useCallback(() => {
    const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    setNodes(ns => [...ns, { id: crypto.randomUUID(), type: 'text', position: pos, data: { content: '' }, width: 260, height: 180 }])
  }, [screenToFlowPosition])

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.key === 'v' || e.key === 'V') setTool('select')
      if (e.key === 'h' || e.key === 'H') setTool('pan')
      if (e.key === 't' || e.key === 'T') addTitle()
      if (e.key === 'f' || e.key === 'F') fitView({ padding: 0.2, duration: 300 })
      if ((e.key === '+' || e.key === '=') && !e.metaKey && !e.ctrlKey) zoomIn({ duration: 200 })
      if (e.key === '-' && !e.metaKey && !e.ctrlKey) zoomOut({ duration: 200 })
      if (e.key === 'Escape') { setContextMenu(null); setStylePanelId(null) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fitView, zoomIn, zoomOut, addTitle])

  // ─── Drag and drop ───────────────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDropping(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!wrapperRef.current?.contains(e.relatedTarget as Element)) setDropping(false)
  }, [])

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setDropping(false)
    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return
    const basePos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const added: Node[] = []
    for (let i = 0; i < files.length; i++) {
      const path = (files[i] as any).path as string
      if (!path) continue
      try {
        const imp = await window.canvas.files.import(path)
        const [w, h] = DEFAULT_SIZES[imp.nodeType] ?? [200, 160]
        added.push({
          id: crypto.randomUUID(),
          type: imp.nodeType,
          position: { x: basePos.x + i * (w + 20), y: basePos.y },
          data: { filePath: imp.relativePath, fileName: imp.fileName, mimeType: imp.mimeType, fileSize: imp.fileSize, content: imp.content ?? '' } as AnyNodeData,
          width: w, height: h,
        })
      } catch { /* skip */ }
    }
    if (added.length) setNodes(ns => [...ns, ...added])
  }, [screenToFlowPosition])

  // ─── Background variant ──────────────────────────────────────────────────────
  const bgVariant = background === 'dots' ? BackgroundVariant.Dots
    : background === 'lines' ? BackgroundVariant.Lines
    : background === 'cross' ? BackgroundVariant.Cross
    : null

  const stylePanelNode = stylePanelId ? nodes.find(n => n.id === stylePanelId) : null
  const spData = stylePanelNode?.data as AnyNodeData | undefined

  return (
    <div ref={wrapperRef} className="relative w-full h-full">
      {/* Drop overlay — Sorter style */}
      {dropping && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          <div className="absolute inset-3 rounded-xl border-2 border-dashed border-accent/60 bg-accent/[0.04] flex flex-col items-center justify-center gap-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-accent">
              <path d="M16 4v16M8 12l8-8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 24h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="font-heading font-semibold text-sm uppercase tracking-widest text-accent">Drop to add</span>
            <span className="font-mono text-[11.7px] text-accent/50">Images · Video · PDF · Text</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <Toolbar
        tool={tool} background={background}
        onToolChange={setTool} onBackgroundChange={setBackground}
        onAddTitle={addTitle} onAddNote={addNote} onAddText={addText}
        zoom={zoom}
        onZoomIn={() => zoomIn({ duration: 200 })}
        onZoomOut={() => zoomOut({ duration: 200 })}
        onZoomFit={() => fitView({ padding: 0.2, duration: 300 })}
      />

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      )}

      {/* React Flow canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        panOnDrag={tool === 'pan' ? true : [1, 2]}
        selectionOnDrag={tool === 'select'}
        zoomOnScroll
        zoomOnPinch
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode="Shift"
        defaultEdgeOptions={{ style: { stroke: '#3a3a3a', strokeWidth: 1.5 } }}
        connectionLineStyle={{ stroke: '#E8B547', strokeWidth: 2, strokeDasharray: '6 3' }}
        connectionMode={'loose' as any}
        proOptions={{ hideAttribution: true }}
      >
        {bgVariant && <Background variant={bgVariant} color="#1e1e1e" gap={20} size={1.5} />}
        <MiniMap
          nodeColor="#2a2a2a"
          maskColor="rgba(12,12,12,0.65)"
          style={{ background: '#141414', border: '1px solid #242424', borderRadius: 8 }}
        />
      </ReactFlow>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onEditLabel={id => { setStylePanelId(id); setContextMenu(null) }}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onOpenStyle={id => { setStylePanelId(id); setContextMenu(null) }}
        />
      )}

      {/* Style panel */}
      {stylePanelId && spData && (
        <StylePanel
          nodeId={stylePanelId}
          initialStyle={spData.nodeStyle}
          nodeType={stylePanelNode?.type}
          nodeLabel={spData.label}
          noteColor={(spData as any).noteColor}
          onClose={() => setStylePanelId(null)}
          onChange={handleStyleChange}
        />
      )}
    </div>
  )
}

// ─── Public component — wraps Inner in Provider ───────────────────────────────
interface Props {
  boardId: string
  onMetaChange: (id: string, nodeCount: number) => void
}

export default function BoardCanvas({ boardId, onMetaChange }: Props) {
  return (
    <ReactFlowProvider>
      <BoardCanvasInner boardId={boardId} onMetaChange={onMetaChange} />
    </ReactFlowProvider>
  )
}
