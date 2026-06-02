'use client'

import { useEffect, useState, useRef } from 'react'

export default function CountUp({
  end,
  suffix = '',
  duration = 1500,
  decimals = 0,
}: {
  end: number
  suffix?: string
  duration?: number
  decimals?: number
}) {
  const [count, setCount] = useState(end)
  const prevEnd = useRef(end)
  const animRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (end === prevEnd.current) return
    prevEnd.current = end

    const from = count
    const diff = end - from
    let startTime: number | null = null

    function tick(now: number) {
      if (!startTime) startTime = now
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const value = from + diff * progress
      setCount(value)
      if (progress < 1) animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [end, duration]) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{count.toFixed(decimals)}{suffix}</>
}
