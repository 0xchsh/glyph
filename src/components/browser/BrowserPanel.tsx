import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { ArrowLeft, ArrowRight, ArrowClockwise, X, Globe } from '@phosphor-icons/react'
import { useBrowserStore } from '../../stores/browser-store'

interface Props {
  projectId: string
}

export function BrowserPanel({ projectId }: Props) {
  const { closeBrowser, updateNav, setSavedUrl, navState, savedUrls } = useBrowserStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState('')
  const [isEditingUrl, setIsEditingUrl] = useState(true)

  const nav = navState[projectId]
  const savedUrl = savedUrls[projectId] ?? ''
  const displayUrl = nav?.url || savedUrl

  // Sync URL input when nav updates (and user isn't editing)
  useEffect(() => {
    if (!isEditingUrl) setUrlInput(nav?.url ?? savedUrl)
  }, [nav?.url, savedUrl, isEditingUrl])

  const getBounds = useCallback(() => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    return {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    }
  }, [])

  // Show browser on mount with initial bounds; auto-focus URL bar
  useLayoutEffect(() => {
    const url = savedUrl || 'about:blank'
    // Defer bounds reading to rAF so the flex layout has fully resolved
    const rafId = requestAnimationFrame(() => {
      const bounds = getBounds()
      if (bounds) window.electron.showBrowser(projectId, url, bounds)
    })
    // Focus and select the URL bar so user can type immediately
    setTimeout(() => {
      urlInputRef.current?.focus()
      urlInputRef.current?.select()
    }, 50)

    return () => {
      cancelAnimationFrame(rafId)
      window.electron.hideBrowser(projectId)
    }
  }, [projectId]) // intentionally only runs on mount/unmount

  // Keep bounds in sync with resize
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = () => {
      const bounds = getBounds()
      if (bounds) window.electron.setBrowserBounds(projectId, bounds)
    }

    const ro = new ResizeObserver(update)
    ro.observe(el)

    return () => ro.disconnect()
  }, [projectId, getBounds])

  // Listen for nav updates from main process
  useEffect(() => {
    return window.electron.onBrowserNavUpdate((pid, info) => {
      if (pid !== projectId) return
      updateNav(pid, info)
    })
  }, [projectId, updateNav])

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
    <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-base">
      {/* Browser toolbar */}
      <div className="flex items-center gap-1 px-2 h-10 border-b border-edge shrink-0 bg-base">
        <button
          onClick={() => window.electron.browserBack(projectId)}
          className="no-drag p-1.5 text-t3 hover:text-t1 disabled:opacity-30 disabled:cursor-default transition-colors rounded hover:bg-overlay"
          disabled={!nav?.canGoBack}
          title="Go back"
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={() => window.electron.browserForward(projectId)}
          className="no-drag p-1.5 text-t3 hover:text-t1 disabled:opacity-30 disabled:cursor-default transition-colors rounded hover:bg-overlay"
          disabled={!nav?.canGoForward}
          title="Go forward"
        >
          <ArrowRight size={14} />
        </button>
        <button
          onClick={() => window.electron.browserReload(projectId)}
          className="no-drag p-1.5 text-t3 hover:text-t1 transition-colors rounded hover:bg-overlay"
          title="Reload"
        >
          <ArrowClockwise size={14} className={nav?.isLoading ? 'animate-spin' : ''} />
        </button>

        {/* URL bar */}
        <div className="no-drag flex-1 flex items-center bg-overlay rounded px-2.5 py-1 gap-2 mx-1">
          <Globe size={11} className="text-t4 shrink-0" />
          <input
            ref={urlInputRef}
            type="text"
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
            className="flex-1 text-xs text-t2 bg-transparent outline-none min-w-0 selectable placeholder:text-t4"
          />
        </div>

        {/* Close browser */}
        <button
          onClick={() => closeBrowser(projectId)}
          title="Close browser"
          className="no-drag p-1.5 text-t3 hover:text-t1 transition-colors rounded hover:bg-overlay"
        >
          <X size={14} />
        </button>
      </div>

      {/* Browser content area — BrowserView is overlaid here by Electron */}
      <div ref={containerRef} className="flex-1 min-h-0 bg-panel" />
    </div>
  )
}
