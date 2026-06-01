'use client'

import { useEffect, useState, useCallback } from 'react'

let addToast: ((msg: string) => void) | null = null

export function showToast(msg: string) {
  addToast?.(msg)
}

export default function Toast() {
  const [items, setItems] = useState<Array<{ id: number; msg: string }>>([])

  const add = useCallback((msg: string) => {
    const id = Date.now()
    setItems(prev => [...prev, { id, msg }])
    setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 4000)
  }, [])

  useEffect(() => { addToast = add; return () => { addToast = null } }, [add])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {items.map(i => (
        <div
          key={i.id}
          className="animate-slide-up rounded-xl border border-indigo-500/30 bg-indigo-950/90 px-5 py-3 text-sm text-indigo-100 shadow-lg shadow-indigo-900/30 backdrop-blur-md"
        >
          {i.msg}
        </div>
      ))}
    </div>
  )
}
