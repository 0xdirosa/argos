'use client'

import { useEffect, useRef, useState } from 'react'

export default function TypeWriter({
  text,
  speed = 40,
}: {
  text: string
  speed?: number
}) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    setDisplayed('')
    setDone(false)
    function tick() {
      if (i >= text.length) { setDone(true); return }
      setDisplayed(text.slice(0, i + 1))
      i++
      setTimeout(tick, speed)
    }
    tick()
  }, [text, speed])

  return (
    <span>
      {displayed}
      {!done && <span className="animate-pulse">|</span>}
    </span>
  )
}
