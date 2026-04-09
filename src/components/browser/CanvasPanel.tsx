import { useLayoutEffect, useMemo, useState } from 'react'
import {
  Tldraw, createTLStore, getSnapshot, loadSnapshot,
  SelectToolbarItem, HandToolbarItem, DrawToolbarItem,
  TextToolbarItem, RectangleToolbarItem, EllipseToolbarItem,
  ArrowToolbarItem, NoteToolbarItem,
  DefaultToolbar,
  TLUiComponents,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { getPaletteHex } from '../../lib/palettes'
import { useActiveProject } from '../../stores/project-store'

interface Props {
  projectId: string
}

// Only keep essential tools in the toolbar
function CanvasToolbar() {
  return (
    <DefaultToolbar>
      <SelectToolbarItem />
      <HandToolbarItem />
      <DrawToolbarItem />
      <TextToolbarItem />
      <RectangleToolbarItem />
      <EllipseToolbarItem />
      <ArrowToolbarItem />
      <NoteToolbarItem />
    </DefaultToolbar>
  )
}

// Strip out everything we don't need
const CANVAS_COMPONENTS: TLUiComponents = {
  MenuPanel: null,
  MainMenu: null,
  PageMenu: null,
  StylePanel: null,
  NavigationPanel: null,
  Minimap: null,
  ActionsMenu: null,
  QuickActions: null,
  HelperButtons: null,
  DebugPanel: null,
  DebugMenu: null,
  SharePanel: null,
  KeyboardShortcutsDialog: null,
  Toolbar: CanvasToolbar,
}

export default function CanvasPanel({ projectId }: Props) {
  const store = useMemo(() => createTLStore(), [projectId])
  const project = useActiveProject()
  const accentColor = project ? getPaletteHex(project.palette) : '#71717a'
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    setReady(false)
    let cancelled = false

    // Load persisted state
    ;(async () => {
      try {
        const data = await window.electron.loadCanvasState(projectId)
        if (data && !cancelled) {
          const snapshot = JSON.parse(data)
          loadSnapshot(store, snapshot)
        }
      } catch {
        // No saved state or corrupted — start fresh
      }
      if (!cancelled) setReady(true)
    })()

    // Save on changes (debounced)
    let saveTimer: ReturnType<typeof setTimeout> | null = null
    const save = () => {
      try {
        const snapshot = getSnapshot(store)
        window.electron.saveCanvasState(projectId, JSON.stringify(snapshot))
      } catch {
        // Silently fail
      }
    }

    const cleanup = store.listen(() => {
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(save, 2000)
    })

    return () => {
      cancelled = true
      cleanup()
      if (saveTimer) clearTimeout(saveTimer)
      // Flush final save
      save()
    }
  }, [store, projectId])

  if (!ready) {
    return <div className="w-full h-full bg-panel" />
  }

  return (
    <div className="w-full h-full" style={{ '--color-accent': accentColor } as React.CSSProperties}>
      <Tldraw store={store} components={CANVAS_COMPONENTS} />
    </div>
  )
}
