import { useState, useRef, useCallback, useEffect } from 'react'

export type ResizeDirection = 'right' | 'left' | 'up' | 'down'

export function usePanelResize(initialPct: number, minPct: number, maxPct: number, direction: ResizeDirection) {
  const [pct, setPct] = useState(initialPct)
  const dragging = useRef(false)
  const startPos = useRef(0)
  const startPct = useRef(0)
  const isVertical = direction === 'up' || direction === 'down'

  const reset = useCallback(() => setPct(initialPct), [initialPct])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startPos.current = isVertical ? e.clientY : e.clientX
    startPct.current = pct
    document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize'
    document.body.style.userSelect = 'none'
  }, [pct, isVertical])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const deltaPct = isVertical
        ? ((e.clientY - startPos.current) / window.innerHeight) * 100
        : ((e.clientX - startPos.current) / window.innerWidth) * 100
      const next = direction === 'right' || direction === 'down'
        ? startPct.current + deltaPct
        : startPct.current - deltaPct
      setPct(Math.min(maxPct, Math.max(minPct, next)))
    }
    const onMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [minPct, maxPct, direction, isVertical])

  return { pct, onMouseDown, reset }
}
