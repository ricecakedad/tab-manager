import { useEffect, useState, useRef } from 'react'
import './App.css'
import Bookmarks from './components/Bookmarks'
import QuickLauncher from './components/QuickLauncher'
import Sessions from './components/Sessions'
import { useStore } from './store/useStore'
import { saveCurrentSession } from './shared/storage'
import type { TabInfo } from './shared/types'

function App() {
  const { spaces, activeSpaceId, initialize, setActiveSpace, addSpace, deleteSpace, isDarkMode, toggleDarkMode, sessions } = useStore()
  const [sessionName, setSessionName] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openTabs, setOpenTabs] = useState<TabInfo[]>([])
  const sidebarTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    initialize()
    if ((globalThis as any).chrome?.tabs) {
      ;(globalThis as any).chrome.tabs.query({}, (tabs: any[]) => {
        setOpenTabs(tabs.map((tab: any) => ({
          id: tab.id, title: tab.title, url: tab.url, favicon: tab.favIconUrl || '', active: tab.active
        })))
      })
    }
  }, [initialize])

  const handleSaveSession = async () => {
    const name = sessionName || `Session ${new Date().toLocaleString()}`
    if ((globalThis as any).chrome?.runtime) {
      ;(globalThis as any).chrome.runtime.sendMessage({ action: 'save-current-session', name })
    } else {
      await saveCurrentSession(name, [])
      alert('已保存会话（开发模式）')
    }
  }

  const handleTabClick = (tab: TabInfo) => {
    if ((globalThis as any).chrome?.tabs) {
      ;(globalThis as any).chrome.tabs.update(tab.id, { active: true })
    }
    setSidebarOpen(false)
  }

  return (
    <div className="app-root">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} onMouseEnter={() => setSidebarOpen(true)} onMouseLeave={() => { sidebarTimeoutRef.current = setTimeout(() => setSidebarOpen(false), 300) }}>
        <div className="sidebar-header">
          <h2>打开的标签</h2>
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>×</button>
        </div>
        <div className="sidebar-content">
          {openTabs.length === 0 ? (
            <div className="empty-tabs">暂无打开的标签</div>
          ) : (
            <ul className="tabs-list">
              {openTabs.map(tab => (
                <li key={tab.id} className={`tab-item ${tab.active ? 'active' : ''}`} onClick={() => handleTabClick(tab)} draggable onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'tab', data: tab }))} title={tab.title}>
                  {tab.favicon && <img src={tab.favicon} alt="" className="tab-favicon" />}
                  <span className="tab-title">{tab.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="main-content">
        <header className="top-header-enhanced">
          <div className="header-left">
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <div className="spaces-nav-enhanced">
              {spaces.map(s => (
                <div key={s.id} className="space-item-wrapper">
                  <button className={`space-item-enhanced ${s.id === activeSpaceId ? 'active' : ''}`} onClick={() => setActiveSpace(s.id)} title={s.name}>
                    <span className="space-icon">{s.icon}</span>
                    <span className="space-name">{s.name}</span>
                  </button>
                  <button className="delete-space-btn" onClick={(e) => { e.stopPropagation(); if (confirm('确定删除此 Space？')) deleteSpace(s.id) }} title="删除">×</button>
                </div>
              ))}
              <button className="add-space-btn-enhanced" onClick={async () => { const n = prompt('Space 名称'); if (n) await addSpace(n, '🗂️', '#888') }}>＋</button>
            </div>
          </div>
          
          <div className="header-right-enhanced">
            <input className="session-name-input-enhanced" placeholder="会话名称（可选）" value={sessionName} onChange={e => setSessionName(e.target.value)} />
            <button className="save-btn-enhanced" onClick={handleSaveSession}>保存会话</button>
            <button className="theme-toggle-btn" onClick={toggleDarkMode} title={isDarkMode ? '浅色模式' : '深色模式'}>
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <main className="main-area-enhanced">
          <Bookmarks />
        </main>

        <footer className="bottom-toolbar-enhanced">
          <Sessions />
          {sessions.length > 0 && (
            <div className="sessions-mini">
              <strong>最近会话:</strong>
              <span>{sessions[sessions.length - 1].name} ({new Date(sessions[sessions.length - 1].savedAt).toLocaleDateString()})</span>
            </div>
          )}
        </footer>
      </div>

      <QuickLauncher />
    </div>
  )
}

export default App
