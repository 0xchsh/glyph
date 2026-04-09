import { useRef, useEffect, useLayoutEffect, useState, useCallback, lazy, Suspense } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowClockwise, Globe,
  Desktop, DeviceTabletSpeaker, DeviceMobileSpeaker,
  PaintBrush, Cursor, Terminal, CornersOut, CornersIn,
} from '@phosphor-icons/react'
import { useBrowserStore } from '../../stores/browser-store'
import { ConsolePanel } from './ConsolePanel'

const CanvasPanel = lazy(() => import('./CanvasPanel'))

type ViewportMode = 'desktop' | 'tablet' | 'mobile'

const VIEWPORT_WIDTHS: Record<ViewportMode, number | null> = {
  desktop: null,
  tablet: 768,
  mobile: 375,
}

interface Props {
  projectId: string
  defaultUrl?: string
  layout: 'horizontal' | 'vertical'
}

export function BrowserPanel({ projectId, defaultUrl, layout }: Props) {
  const { updateNav, setSavedUrl, navState, savedUrls, setCanvasMode, toggleConsole, toggleFullscreen, canvasMode, consoleOpen, fullscreen } = useBrowserStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState('')
  const [isEditingUrl, setIsEditingUrl] = useState(true)
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop')
  const [customWidth, setCustomWidth] = useState<number | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  const shownRef = useRef(false)

  const nav = navState[projectId]
  const savedUrl = savedUrls[projectId] ?? ''
  const displayUrl = nav?.url || savedUrl
  const isCanvas = canvasMode[projectId] ?? false
  const isConsoleOpen = consoleOpen[projectId] ?? false
  const isFullscreen = fullscreen[projectId] ?? false

  // Sync URL input when nav updates (and user isn't editing)
  useEffect(() => {
    if (!isEditingUrl) setUrlInput(nav?.url ?? savedUrl)
  }, [nav?.url, savedUrl, isEditingUrl])

  const getBounds = useCallback(() => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const dpr = window.devicePixelRatio
    if (rect.width < 50 || rect.height < 50) return null

    const maxWidth = customWidth ?? VIEWPORT_WIDTHS[viewportMode]
    let viewWidth = rect.width
    let viewX = rect.left

    if (maxWidth && rect.width > maxWidth) {
      viewWidth = maxWidth
      viewX = rect.left + (rect.width - maxWidth) / 2
    }

    return {
      x: Math.round(viewX * dpr),
      y: Math.round(rect.top * dpr),
      width: Math.round(viewWidth * dpr),
      height: Math.round(rect.height * dpr),
    }
  }, [viewportMode, customWidth])

  // Cleanup — hideBrowser on unmount / projectId change
  useLayoutEffect(() => {
    shownRef.current = false
    return () => {
      shownRef.current = false
      window.electron.hideBrowser(projectId)
    }
  }, [projectId])

  // Show + keep bounds in sync via ResizeObserver (only when not in canvas mode)
  useEffect(() => {
    if (isCanvas) {
      // Hide BrowserView when in canvas mode
      if (shownRef.current) {
        window.electron.hideBrowser(projectId)
        shownRef.current = false
      }
      return
    }

    const url = savedUrl || defaultUrl || 'about:blank'
    const el = containerRef.current
    if (!el) return

    const update = () => {
      const bounds = getBounds()
      if (!bounds) return

      if (!shownRef.current) {
        shownRef.current = true
        window.electron.showBrowser(projectId, url, bounds)
      } else {
        window.electron.setBrowserBounds(projectId, bounds)
      }
    }

    const ro = new ResizeObserver(update)
    ro.observe(el)
    ro.observe(document.body)

    return () => ro.disconnect()
  }, [projectId, getBounds, isCanvas])

  // Update bounds when viewport mode changes
  useEffect(() => {
    if (!shownRef.current || isCanvas) return
    const bounds = getBounds()
    if (bounds) window.electron.setBrowserBounds(projectId, bounds)
  }, [viewportMode, projectId, getBounds, isCanvas])

  // Auto-focus URL bar on mount
  useEffect(() => {
    if (isCanvas) return
    const id = setTimeout(() => {
      urlInputRef.current?.focus()
      urlInputRef.current?.select()
    }, 50)
    return () => clearTimeout(id)
  }, [projectId, isCanvas])

  // Listen for nav updates from main process
  useEffect(() => {
    return window.electron.onBrowserNavUpdate((pid, info) => {
      if (pid !== projectId) return
      updateNav(pid, info)
    })
  }, [projectId, updateNav])

  // Track container width for viewport resize handles
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleViewportDrag = useCallback((side: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = customWidth ?? VIEWPORT_WIDTHS[viewportMode] ?? containerWidth
    let rafId = 0

    const onMove = (moveE: MouseEvent) => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const deltaX = moveE.clientX - startX
        const widthChange = side === 'left' ? -deltaX * 2 : deltaX * 2
        const newWidth = Math.max(280, Math.min(containerWidth, startWidth + widthChange))
        setCustomWidth(newWidth)
      })
    }

    const onUp = () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [viewportMode, customWidth, containerWidth])

  const vpWidth = customWidth ?? VIEWPORT_WIDTHS[viewportMode]
  const isConstrained = vpWidth !== null && containerWidth > vpWidth
  const sideWidth = isConstrained ? (containerWidth - vpWidth!) / 2 : 0

  const navigate = useCallback((raw: string) => {
    let url = raw.trim()
    if (!url) return
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (/^localhost(:\d+)?(\/.*)?$/.test(url) || /^127\.0\.0\.1(:\d+)?/.test(url)) {
        url = 'http://' + url
      } else if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url
      } else {
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`
      }
    }
    setSavedUrl(projectId, url)
    window.electron.navigateBrowser(projectId, url)
  }, [projectId, setSavedUrl])

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-panel">
      {/* Browser toolbar — also serves as macOS title bar drag region */}
      <div className={`flex items-center gap-1 h-10 border-b border-edge shrink-0 bg-panel drag-region ${
        layout === 'horizontal' || isFullscreen ? 'pl-[78px] pr-2' : 'px-2'
      }`}>
        {/* Left — Canvas/Browser toggle */}
        <div className="no-drag flex items-center bg-overlay border border-edge rounded p-0.5 gap-0.5">
          <button
            onClick={() => setCanvasMode(projectId, true)}
            className={`p-1 rounded transition-colors ${
              isCanvas ? 'bg-panel text-t1' : 'text-t4 hover:text-t2'
            }`}
            aria-label="Canvas"
            title="Canvas"
          >
            <PaintBrush size={13} weight={isCanvas ? 'fill' : 'regular'} />
          </button>
          <button
            onClick={() => setCanvasMode(projectId, false)}
            className={`p-1 rounded transition-colors ${
              !isCanvas ? 'bg-panel text-t1' : 'text-t4 hover:text-t2'
            }`}
            aria-label="Browser"
            title="Browser"
          >
            <Globe size={13} weight={!isCanvas ? 'fill' : 'regular'} />
          </button>
        </div>

        {/* Center — URL bar with viewport picker (hidden in canvas mode) */}
        {!isCanvas && (
          <div className="flex-1 flex justify-center min-w-0">
            <div className="no-drag flex items-center bg-overlay border border-edge rounded px-1 py-0.5 gap-1 w-full max-w-[360px]">
              {/* Viewport switcher (inside URL bar) */}
              <div className="flex items-center gap-0.5 shrink-0">
                {([
                  { mode: 'desktop' as ViewportMode, icon: Desktop, label: 'Desktop' },
                  { mode: 'tablet' as ViewportMode, icon: DeviceTabletSpeaker, label: 'Tablet' },
                  { mode: 'mobile' as ViewportMode, icon: DeviceMobileSpeaker, label: 'Mobile' },
                ]).map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => { setViewportMode(mode); setCustomWidth(null) }}
                    aria-label={label}
                    className={`p-1 rounded transition-colors ${
                      viewportMode === mode
                        ? 'bg-panel text-t1'
                        : 'text-t4 hover:text-t2'
                    }`}
                  >
                    <Icon size={12} weight={viewportMode === mode ? 'fill' : 'regular'} />
                  </button>
                ))}
              </div>

              <div className="w-px h-4 bg-edge shrink-0" />

              {/* URL input */}
              <input
                ref={urlInputRef}
                type="text"
                aria-label="URL"
                value={isEditingUrl ? urlInput : displayUrl}
                placeholder="Enter URL or search…"
                onFocus={(e) => {
                  setIsEditingUrl(true)
                  setUrlInput(displayUrl)
                  e.target.select()
                }}
                onBlur={() => setIsEditingUrl(false)}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigate(urlInput)
                    e.currentTarget.blur()
                  } else if (e.key === 'Escape') {
                    setIsEditingUrl(false)
                    e.currentTarget.blur()
                  }
                }}
                className={`flex-1 text-xs bg-transparent outline-none min-w-0 selectable placeholder:text-t4 px-1 ${
                  !isEditingUrl && displayUrl ? 'text-t1' : 'text-t2'
                }`}
              />

              {/* Reload */}
              <button
                onClick={() => window.electron.browserReload(projectId)}
                className="p-1 text-t3 hover:text-t1 transition-colors rounded hover:bg-panel shrink-0"
                aria-label="Reload"
              >
                <ArrowClockwise size={12} className={nav?.isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        )}

        {/* Spacer when in canvas mode */}
        {isCanvas && <div className="flex-1" />}

        {/* Right — Agitation, Console, Fullscreen */}
        <div className="no-drag flex items-center gap-0.5">
          <button
            className="p-1.5 text-t3 hover:text-t1 transition-colors rounded hover:bg-overlay"
            aria-label="Inspect"
            title="Inspect"
          >
            <Cursor size={14} />
          </button>
          <button
            onClick={() => toggleConsole(projectId)}
            className={`p-1.5 rounded transition-colors ${
              isConsoleOpen ? 'text-accent' : 'text-t3 hover:text-t1 hover:bg-overlay'
            }`}
            aria-label="Console"
            title="Console"
          >
            <Terminal size={14} weight={isConsoleOpen ? 'fill' : 'regular'} />
          </button>
          <button
            onClick={() => toggleFullscreen(projectId)}
            className={`p-1.5 rounded transition-colors ${
              isFullscreen ? 'text-accent' : 'text-t3 hover:text-t1 hover:bg-overlay'
            }`}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <CornersIn size={14} /> : <CornersOut size={14} />}
          </button>
        </div>
      </div>

      {/* Content area — flex-row for horizontal console (right), flex-col for vertical (bottom) */}
      <div className={`flex-1 min-h-0 flex ${layout === 'horizontal' ? 'flex-row' : 'flex-col'}`}>
        {isCanvas ? (
          <div className="flex-1 min-h-0 min-w-0">
            <Suspense fallback={<div className="flex-1 h-full bg-panel" />}>
              <CanvasPanel projectId={projectId} />
            </Suspense>
          </div>
        ) : (
          <>
            {/* Browser content — BrowserView is overlaid here by Electron */}
            <div className="flex-1 min-h-0 min-w-0 relative">
              <div ref={containerRef} className="absolute inset-0 bg-panel" />
              {isConstrained && sideWidth > 0 && (
                <>
                  <div
                    className="absolute top-0 bottom-0 left-0 cursor-col-resize z-10 group flex items-center justify-end"
                    style={{ width: sideWidth }}
                    onMouseDown={(e) => handleViewportDrag('left', e)}
                  >
                    <div className="w-[3px] h-full bg-transparent group-hover:bg-accent/40 transition-colors" />
                  </div>
                  <div
                    className="absolute top-0 bottom-0 right-0 cursor-col-resize z-10 group flex items-center justify-start"
                    style={{ width: sideWidth }}
                    onMouseDown={(e) => handleViewportDrag('right', e)}
                  >
                    <div className="w-[3px] h-full bg-transparent group-hover:bg-accent/40 transition-colors" />
                  </div>
                </>
              )}
            </div>

            {/* Console panel */}
            {isConsoleOpen && (
              <div
                className={`shrink-0 ${layout === 'horizontal' ? 'border-l border-edge' : 'border-t border-edge'}`}
                style={layout === 'horizontal' ? { width: '30%' } : { height: '30%' }}
              >
                <ConsolePanel projectId={projectId} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
