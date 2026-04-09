import { useEffect, useRef, useState, useCallback } from 'react'
import { Trash } from '@phosphor-icons/react'

interface ConsoleMessage {
  id: number
  level: number // 0=verbose, 1=info, 2=warning, 3=error
  message: string
  source: string
  line: number
  timestamp: number
}

const LEVEL_LABELS = ['verbose', 'info', 'warn', 'error'] as const
const LEVEL_COLORS = [
  'text-t4',         // verbose
  'text-t3',         // info
  'text-yellow-400', // warn
  'text-red-400',    // error
]

const MAX_MESSAGES = 1000
let nextId = 0

export function ConsolePanel({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ConsoleMessage[]>([])
  const [filter, setFilter] = useState<number | null>(null) // null = all
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  // Subscribe to console messages
  useEffect(() => {
    return window.electron.onBrowserConsoleMessage((pid, msg) => {
      if (pid !== projectId) return
      setMessages((prev) => {
        const next = [...prev, {
          id: nextId++,
          level: msg.level,
          message: msg.message,
          source: msg.source,
          line: msg.line,
          timestamp: Date.now(),
        }]
        // Ring buffer: drop oldest if over limit
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
      })
    })
  }, [projectId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 30
  }, [])

  const clear = useCallback(() => setMessages([]), [])

  const filtered = filter !== null ? messages.filter((m) => m.level === filter) : messages

  return (
    <div className="flex flex-col h-full w-full bg-base overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-edge shrink-0">
        <span className="text-[11px] font-semibold text-t4">Console</span>
        <div className="flex items-center gap-1">
          {/* Level filter */}
          <div className="flex items-center gap-0.5">
            {[null, 2, 3].map((level) => (
              <button
                key={level ?? 'all'}
                onClick={() => setFilter(level)}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  filter === level ? 'bg-overlay text-t1' : 'text-t4 hover:text-t2'
                }`}
              >
                {level === null ? 'All' : level === 2 ? 'Warn' : 'Error'}
              </button>
            ))}
          </div>
          <button
            onClick={clear}
            className="p-1 text-t4 hover:text-t2 transition-colors rounded"
            title="Clear console"
          >
            <Trash size={12} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden font-mono text-[11px] leading-[18px]"
      >
        {filtered.length === 0 ? (
          <p className="text-t4 text-[11px] px-3 py-2">No console output</p>
        ) : (
          filtered.map((msg) => (
            <div
              key={msg.id}
              className={`px-3 py-0.5 border-b border-edge/30 ${LEVEL_COLORS[msg.level] ?? 'text-t3'} ${
                msg.level === 3 ? 'bg-red-500/5' : msg.level === 2 ? 'bg-yellow-500/5' : ''
              }`}
            >
              <span className="break-all">{msg.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
