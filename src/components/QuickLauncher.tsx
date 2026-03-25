import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { useStore } from '../store/useStore'

type Hit = { id: string; title: string; url: string; subtitle?: string }

export default function QuickLauncher() {
  const { spaces } = useStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      if ((isMac && e.metaKey && e.key.toLowerCase() === 'k') || (!isMac && e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const items: Hit[] = useMemo(() => {
    const list: Hit[] = []
    for (const s of spaces) {
      for (const g of s.groups) {
        for (const it of g.items) {
          list.push({ id: it.id, title: it.title, url: it.url, subtitle: `${s.name} / ${g.name}` })
        }
      }
    }
    return list
  }, [spaces])

  const fuse = useMemo(() => new Fuse(items, { keys: ['title', 'url', 'subtitle'], threshold: 0.4 }), [items])
  const results = query.trim() ? fuse.search(query).map(r => r.item) : items.slice(0, 20)

  if (!open) return null

  return (
    <div className="quick-launcher-overlay" onClick={() => setOpen(false)}>
      <div className="quick-launcher" onClick={e => e.stopPropagation()}>
        <input autoFocus placeholder="搜索书签/标签/URL (Cmd/Ctrl+K)" value={query} onChange={e => setQuery(e.target.value)} />
        <ul className="ql-results">
          {results.map(r => (
            <li key={r.id} onClick={() => window.open(r.url, '_blank') }>
              <div className="title">{r.title}</div>
              <div className="sub">{r.subtitle}</div>
            </li>
          ))}
          {results.length === 0 && <li className="empty">无匹配结果</li>}
        </ul>
      </div>
    </div>
  )
}
