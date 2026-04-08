import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { ArrowLeft, ArrowRight, ArrowClockwise, Globe } from '@phosphor-icons/react'
import { useBrowserStore } from '../../stores/browser-store'

interface Props {
  projectId: string
  defaultUrl?: string
  sidebarCollapsed?: boolean
}

export function BrowserPanel({ projectId, defaultUrl, sidebarCollapsed }: Props) {
  const { updateNav, setSavedUrl, navState, savedUrls } = useBrowserStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState('')
  const [isEditingUrl, setIsEditingUrl] = useState(true)

  // Whether showBrowser has been called for this projectId mount
  const shownRef = useRef(false)

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
    // WebContentsView.setBounds() in Electron 30+ expects physical pixels.
    // getBoundingClientRect() returns CSS/logical pixels, so multiply by DPR.
    const dpr = window.devicePixelRatio
    // y < 35*dpr means layout hasn't resolved (left is also wrong, often 0)
    if (rect.top < 35 || rect.width < 50 || rect.height < 50) return null
    return {
      x: Math.round(rect.left * dpr),
      y: Math.round(rect.top * dpr),
      width: Math.round(rect.width * dpr),
      height: Math.round(rect.height * dpr),
    }
  }, [])

  // Cleanup only — hideBrowser on unmount / projectId change
  useLayoutEffect(() => {
    shownRef.current = false
    return () => {
      shownRef.current = false
      window.electron.hideBrowser(projectId)
    }
  }, [projectId])

  // Show + keep bounds in sync via ResizeObserver.
  // Using ResizeObserver for the initial show means we never call showBrowser
  // with stale bounds — the callback only fires once the element has real
  // dimensions, so the BrowserView can't cover the sidebar at x=0.
  useEffect(() => {
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

    // Observing both the container (size) and body (position shift from panel drags)
    const ro = new ResizeObserver(update)
    ro.observe(el)
    ro.observe(document.body)

    return () => ro.disconnect()
  }, [projectId, getBounds]) // savedUrl intentionally omitted — only used for initial nav

  // Auto-focus URL bar on mount
  useEffect(() => {
    const id = setTimeout(() => {
      urlInputRef.current?.focus()
      urlInputRef.current?.select()
    }, 50)
    return () => clearTimeout(id)
  }, [projectId])

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
      <div className={`flex items-center gap-1 px-2 h-10 border-b border-edge shrink-0 bg-base${sidebarCollapsed ? ' !pl-[96px]' : ''}`}>
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
        <div className="no-drag flex-1 flex items-center bg-overlay border border-edge rounded px-2.5 py-1 gap-2 mx-1">
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
            className="flex-1 text-xs text-t3 bg-transparent outline-none min-w-0 selectable placeholder:text-t4"
          />
        </div>
      </div>

      {/* Browser content area — BrowserView is overlaid here by Electron */}
      <div ref={containerRef} className="flex-1 min-h-0 bg-panel" />
    </div>
  )
}
