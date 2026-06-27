import { useState, useEffect, useCallback } from 'react'
import type { AppScreen, BoardMeta, VaultState } from './types'
import WelcomeScreen from './components/WelcomeScreen'
import Sidebar from './components/Sidebar'
import BoardCanvas from './components/BoardCanvas'
import TitleBar from './components/TitleBar'
import UpdateBar from './components/UpdateBar'
import MediaLightbox, { type LightboxState } from './components/MediaLightbox'

export default function App() {
  const [screen, setScreen]     = useState<AppScreen>('loading')
  const [vault, setVault]       = useState<VaultState | null>(null)
  const [boards, setBoards]     = useState<BoardMeta[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)

  useEffect(() => {
    function onPreview(e: Event) {
      setLightbox((e as CustomEvent<LightboxState>).detail)
    }
    window.addEventListener('canvas:preview', onPreview)
    return () => window.removeEventListener('canvas:preview', onPreview)
  }, [])

  // On mount: check if vault is already configured
  useEffect(() => {
    window.canvas.vault.initFromPrefs().then(res => {
      if (res.valid && res.vaultPath && res.vaultName) {
        setVault({ path: res.vaultPath, name: res.vaultName })
        setScreen('app')
        loadBoards(res.lastBoardId)
      } else {
        setScreen('welcome')
      }
    })
  }, [])

  const loadBoards = useCallback(async (openId?: string | null) => {
    const list = await window.canvas.boards.list()
    setBoards(list)
    if (openId && list.find(b => b.id === openId)) {
      setActiveBoardId(openId)
    } else if (list.length > 0) {
      setActiveBoardId(list[0].id)
    }
  }, [])

  const onVaultReady = useCallback(async (vaultState: VaultState) => {
    setVault(vaultState)
    setScreen('app')
    await loadBoards()
  }, [loadBoards])

  const onSelectBoard = useCallback((id: string) => {
    setActiveBoardId(id)
    window.canvas.boards.setLast(id)
  }, [])

  const onCreateBoard = useCallback(async () => {
    const name = `Board ${boards.length + 1}`
    const board = await window.canvas.boards.create(name)
    setBoards(prev => [{ id: board.id, name: board.name, createdAt: board.createdAt, updatedAt: board.updatedAt, nodeCount: 0 }, ...prev])
    setActiveBoardId(board.id)
  }, [boards.length])

  const onDeleteBoard = useCallback(async (id: string) => {
    await window.canvas.boards.delete(id)
    setBoards(prev => {
      const next = prev.filter(b => b.id !== id)
      if (activeBoardId === id) {
        setActiveBoardId(next[0]?.id ?? null)
      }
      return next
    })
  }, [activeBoardId])

  const onRenameBoard = useCallback(async (id: string, name: string) => {
    await window.canvas.boards.rename(id, name)
    setBoards(prev => prev.map(b => b.id === id ? { ...b, name } : b))
  }, [])

  const onBoardMetaChange = useCallback((id: string, nodeCount: number) => {
    setBoards(prev => prev.map(b => b.id === id ? { ...b, nodeCount } : b))
  }, [])

  if (screen === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  if (screen === 'welcome') {
    return <WelcomeScreen onVaultReady={onVaultReady} />
  }

  return (
    <>
    <MediaLightbox state={lightbox} onClose={() => setLightbox(null)} />
    <div className="w-full h-full flex flex-col">
      <TitleBar
        vaultName={vault?.name ?? 'Brotherhood Canvas'}
        boardName={boards.find(b => b.id === activeBoardId)?.name}
      />
      <UpdateBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          boards={boards}
          activeBoardId={activeBoardId}
          onSelect={onSelectBoard}
          onCreate={onCreateBoard}
          onDelete={onDeleteBoard}
          onRename={onRenameBoard}
        />
        <div className="flex-1 relative overflow-hidden">
          {activeBoardId ? (
            <BoardCanvas
              key={activeBoardId}
              boardId={activeBoardId}
              onMetaChange={onBoardMetaChange}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-text-secondary">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
              <p className="text-[13.7px]">Create a board to get started</p>
              <button
                onClick={onCreateBoard}
                className="no-drag mt-1 px-4 py-1.5 bg-accent text-bg rounded-md text-[12.7px] font-medium hover:bg-accent/90 transition-colors"
              >
                New Board
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
