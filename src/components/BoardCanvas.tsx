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
import AlignmentGuides, { type Guide } from './AlignmentGuides'

// ─── Module-level canvas clipboard (persists across board switches) ──────────
let canvasClipboard: { nodes: Node[]; edges: Edge[] } | null = null

// ─── Measure natural media dimensions preserving aspect ratio ────────────────
function getMediaDimensions(nodeType: string, url: string): Promise<[number, number]> {
  const MAX = 480
  if (nodeType === 'image') {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const w = img.naturalWidth || 240, h = img.naturalHeight || 200
        const r = Math.min(MAX / w, MAX / h, 1)
        resolve([Math.round(w * r), Math.round(h * r)])
      }
      img.onerror = () => resolve([240, 200])
      img.src = url
    })
  }
  if (nodeType === 'video') {
    return new Promise(resolve => {
      const v = document.createElement('video')
      v.onloadedmetadata = () => {
        const w = v.videoWidth || 280, h = v.videoHeight || 200
        const r = Math.min(MAX / w, MAX / h, 1)
        resolve([Math.round(w * r), Math.round(h * r)])
      }
      v.onerror = () => resolve([280, 200])
      v.src = url; v.load()
    })
  }
  return Promise.resolve(DEFAULT_SIZES[nodeType] ?? [200, 160])
}

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
  const [guides, setGuides]           = useState<Guide[]>([])
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

  // ─── Alignment guides ────────────────────────────────────────────────────────
  const SNAP_THRESHOLD = 8

  const onNodeDrag = useCallback((_e: React.MouseEvent, node: Node) => {
    const nw = node.width ?? 0, nh = node.height ?? 0
    const nl = node.position.x, nr = nl + nw, ncx = nl + nw / 2
    const nt = node.position.y, nb = nt + nh, ncy = nt + nh / 2
    const found: Guide[] = []

    for (const other of nodesRef.current) {
      if (other.id === node.id || other.selected) continue
      const ow = other.width ?? 0, oh = other.height ?? 0
      const ol = other.position.x, or_ = ol + ow, ocx = ol + ow / 2
      const ot = other.position.y, ob = ot + oh, ocy = ot + oh / 2

      // Vertical guides (X alignment)
      if (Math.abs(ncx - ocx) < SNAP_THRESHOLD) found.push({ type: 'v', pos: ocx })
      if (Math.abs(nl  - ol)  < SNAP_THRESHOLD) found.push({ type: 'v', pos: ol })
      if (Math.abs(nr  - or_) < SNAP_THRESHOLD) found.push({ type: 'v', pos: or_ })
      if (Math.abs(nl  - or_) < SNAP_THRESHOLD) found.push({ type: 'v', pos: or_ })
      if (Math.abs(nr  - ol)  < SNAP_THRESHOLD) found.push({ type: 'v', pos: ol })

      // Horizontal guides (Y alignment)
      if (Math.abs(ncy - ocy) < SNAP_THRESHOLD) found.push({ type: 'h', pos: ocy })
      if (Math.abs(nt  - ot)  < SNAP_THRESHOLD) found.push({ type: 'h', pos: ot })
      if (Math.abs(nb  - ob)  < SNAP_THRESHOLD) found.push({ type: 'h', pos: ob })
      if (Math.abs(nt  - ob)  < SNAP_THRESHOLD) found.push({ type: 'h', pos: ob })
      if (Math.abs(nb  - ot)  < SNAP_THRESHOLD) found.push({ type: 'h', pos: ot })
    }

    // Deduplicate guides at the same position
    setGuides(found.filter((g, i, arr) =>
      arr.findIndex(o => o.type === g.type && Math.abs(o.pos - g.pos) < 1) === i
    ))
  }, [])

  const onNodeDragStop = useCallback((_e: React.MouseEvent, node: Node) => {
    const nw = node.width ?? 0, nh = node.height ?? 0
    const nl = node.position.x, nr = nl + nw, ncx = nl + nw / 2
    const nt = node.position.y, nb = nt + nh, ncy = nt + nh / 2
    let snapX: number | null = null, snapY: number | null = null

    for (const other of nodesRef.current) {
      if (other.id === node.id) continue
      const ow = other.width ?? 0, oh = other.height ?? 0
      const ol = other.position.x, or_ = ol + ow, ocx = ol + ow / 2
      const ot = other.position.y, ob = ot + oh, ocy = ot + oh / 2

      if (snapX === null) {
        if (Math.abs(ncx - ocx) < SNAP_THRESHOLD) snapX = ocx - nw / 2
        else if (Math.abs(nl - ol)  < SNAP_THRESHOLD) snapX = ol
        else if (Math.abs(nr - or_) < SNAP_THRESHOLD) snapX = or_ - nw
        else if (Math.abs(nl - or_) < SNAP_THRESHOLD) snapX = or_
        else if (Math.abs(nr - ol)  < SNAP_THRESHOLD) snapX = ol - nw
      }
      if (snapY === null) {
        if (Math.abs(ncy - ocy) < SNAP_THRESHOLD) snapY = ocy - nh / 2
        else if (Math.abs(nt - ot)  < SNAP_THRESHOLD) snapY = ot
        else if (Math.abs(nb - ob)  < SNAP_THRESHOLD) snapY = ob - nh
        else if (Math.abs(nt - ob)  < SNAP_THRESHOLD) snapY = ob
        else if (Math.abs(nb - ot)  < SNAP_THRESHOLD) snapY = ot - nh
      }
      if (snapX !== null && snapY !== null) break
    }

    if (snapX !== null || snapY !== null) {
      setNodes(ns => ns.map(n =>
        n.id !== node.id ? n : { ...n, position: { x: snapX ?? n.position.x, y: snapY ?? n.position.y } }
      ))
    }
    setGuides([])
  }, [setNodes])

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

      // Copy selected nodes + their edges
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const selected = nodesRef.current.filter(n => n.selected)
        if (!selected.length) return
        const ids = new Set(selected.map(n => n.id))
        canvasClipboard = {
          nodes: selected,
          edges: edgesRef.current.filter(ed => ids.has(ed.source) && ids.has(ed.target)),
        }
        return
      }

      // Paste — centered on current viewport, works across boards
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        if (!canvasClipboard?.nodes.length) return
        const idMap = new Map<string, string>()
        canvasClipboard.nodes.forEach(n => idMap.set(n.id, crypto.randomUUID()))
        const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
        const xs = canvasClipboard.nodes.map(n => n.position.x)
        const ys = canvasClipboard.nodes.map(n => n.position.y)
        const ox = (Math.min(...xs) + Math.max(...xs)) / 2
        const oy = (Math.min(...ys) + Math.max(...ys)) / 2
        const newNodes = canvasClipboard.nodes.map(n => ({
          ...n,
          id: idMap.get(n.id)!,
          position: { x: center.x + (n.position.x - ox), y: center.y + (n.position.y - oy) },
          selected: true,
          data: { ...n.data },
        }))
        const newEdges = canvasClipboard.edges.map(ed => ({
          ...ed,
          id: crypto.randomUUID(),
          source: idMap.get(ed.source)!,
          target: idMap.get(ed.target)!,
        }))
        setNodes(ns => [...ns.map(n => ({ ...n, selected: false })), ...newNodes])
        if (newEdges.length) setEdges(es => [...es, ...newEdges])
        return
      }

      if (!e.metaKey && !e.ctrlKey) {
        if (e.key === 'v' || e.key === 'V') setTool('select')
        if (e.key === 'h' || e.key === 'H') setTool('pan')
        if (e.key === 't' || e.key === 'T') addTitle()
        if (e.key === 'f' || e.key === 'F') fitView({ padding: 0.2, duration: 300 })
        if (e.key === '+' || e.key === '=') zoomIn({ duration: 200 })
        if (e.key === '-') zoomOut({ duration: 200 })
      }
      if (e.key === 'Escape') { setContextMenu(null); setStylePanelId(null) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fitView, zoomIn, zoomOut, addTitle, screenToFlowPosition, setNodes, setEdges])

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
    let offsetX = 0
    for (const file of files) {
      const path = (file as any).path as string
      if (!path) continue
      try {
        const imp = await window.canvas.files.import(path)
        const url = window.canvas.files.localUrl(imp.relativePath)
        const [w, h] = await getMediaDimensions(imp.nodeType, url)
        added.push({
          id: crypto.randomUUID(),
          type: imp.nodeType,
          position: { x: basePos.x + offsetX, y: basePos.y },
          data: { filePath: imp.relativePath, fileName: imp.fileName, mimeType: imp.mimeType, fileSize: imp.fileSize, content: imp.content ?? '' } as AnyNodeData,
          width: w, height: h,
        })
        offsetX += w + 20
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
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
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
        <AlignmentGuides guides={guides} />
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
