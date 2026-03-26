import { useEffect, useState, useRef, Suspense, lazy } from 'react'
import './App.css'
import Bookmarks from './components/Bookmarks'
const QuickLauncher = lazy(() => import('./components/QuickLauncher'))
const ImportExport = lazy(() => import('./components/ImportExport'))
const Sessions = lazy(() => import('./components/Sessions'))
const SyncSettings = lazy(() => import('./components/SyncSettings')) // 新增
import { useStore } from './store/useStore'
import { saveCurrentSession as saveSessionLocal } from './shared/storage'
import type { TabInfo } from './shared/types'

function App() {
  const { spaces, activeSpaceId, initialize, setActiveSpace, addSpace, addBookmark } = useStore()
  const [name, setName] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true) // 默认打开侧边栏
  const [openTabs, setOpenTabs] = useState<TabInfo[]>([])
  const sidebarRef = useRef<HTMLDivElement>(null)
  const sidebarTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    initialize()
    
    // 获取所有打开的标签
    if ((globalThis as any).chrome && (globalThis as any).chrome.tabs) {
      ;(globalThis as any).chrome.tabs.query({}, (tabs: any[]) => {
        setOpenTabs(tabs.map((tab: any) => ({
          id: tab.id,
          title: tab.title,
          url: tab.url,
          favicon: tab.favIconUrl || '',
          active: tab.active
        })))
      })
    }
  }, [initialize])

  // 侧边栏自动收起逻辑
  const handleSidebarMouseEnter = () => {
    if (sidebarTimeoutRef.current) {
      clearTimeout(sidebarTimeoutRef.current)
    }
    setSidebarOpen(true)
  }

  const handleSidebarMouseLeave = () => {
    sidebarTimeoutRef.current = setTimeout(() => {
      setSidebarOpen(false)
    }, 800) // 延长到 800ms，更友好
  }

  useEffect(() => {
    return () => {
      if (sidebarTimeoutRef.current) {
        clearTimeout(sidebarTimeoutRef.current)
      }
    }
  }, [])

  const handleSave = async () => {
    const sessionName = name || `Session ${new Date().toLocaleString()}`
    if ((globalThis as any).chrome && (globalThis as any).chrome.runtime) {
      ;(globalThis as any).chrome.runtime.sendMessage({ action: 'save-current-session', name: sessionName })
      return
    }
    // Fallback for dev: save empty session
    await saveSessionLocal(sessionName, [])
    alert('已在本地保存会话（开发模式）')
  }

  const handleAddSpace = async () => {
    const n = prompt('新 Space 名称')
    if (n) await addSpace(n, '🗂', '#888')
  }

  const handleTabClick = (tab: TabInfo) => {
    if ((globalThis as any).chrome && (globalThis as any).chrome.tabs) {
      ;(globalThis as any).chrome.tabs.update(tab.id, { active: true })
    }
  }

  const handleTabDragStart = (e: React.DragEvent, tab: TabInfo) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'tab', data: tab }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  // Toby 风格：一键保存所有标签到指定分组
  const handleSaveAllTabsToGroup = async (groupId: string) => {
    let savedCount = 0
    const space = spaces.find(s => s.id === activeSpaceId)
    const group = space?.groups.find(g => g.id === groupId)
    
    if (!group) {
      alert('请先选择或创建一个分组')
      return
    }
    
    for (const tab of openTabs) {
      try {
        await addBookmark(activeSpaceId, groupId, {
          url: tab.url,
          title: tab.title,
          favicon: tab.favicon || '',
          tags: [],
          note: ''
        })
        savedCount++
      } catch (e) {
        console.error('Failed to save tab:', e)
      }
    }
    alert(`✅ 已保存 ${savedCount} 个标签到分组 "${group.name}"`)
  }

  return (
    <div className="app-root">
      {/* 左侧侧边栏 - 显示已打开的标签 */}
      <aside 
        ref={sidebarRef}
        className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
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
                <li 
                  key={tab.id} 
                  className={`tab-item ${tab.active ? 'active' : ''}`}
                  onClick={() => handleTabClick(tab)}
                  draggable
                  onDragStart={(e) => handleTabDragStart(e, tab)}
                  title={tab.title}
                >
                  {tab.favicon && <img src={tab.favicon} alt="" className="tab-favicon" />}
                  <span className="tab-title">{tab.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* 主内容区域 */}
      <div className="main-content">
        {/* 顶部导航栏 */}
        <header className="top-header">
          <div className="header-left">
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <div className="spaces-nav">
              {spaces.map(s => (
                <button 
                  key={s.id} 
                  className={`space-item ${s.id === activeSpaceId ? 'active' : ''}`}
                  onClick={() => setActiveSpace(s.id)}
                  title={s.name}
                >
                  <span className="space-icon">{s.icon}</span>
                  <span className="space-name">{s.name}</span>
                </button>
              ))}
              <button className="add-space-btn" onClick={handleAddSpace} title="新建 Space">
                ＋
              </button>
            </div>
          </div>
          
          <div className="header-right">
            <Suspense fallback={<div className="loading-spinner">☁️</div>}>
              <SyncSettings /> {/* 新增：同步设置按钮 */}
            </Suspense>
            <input 
              className="session-name-input"
              placeholder="会话名称（可选）" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
            <button className="save-btn" onClick={handleSave}>保存会话</button>
          </div>
        </header>

        {/* 新的三栏布局包装器 */}
        <div className="main-content-wrapper">
          {/* 主要内容区域 - 书签分组 */}
          <main className="main-area">
            <Bookmarks 
              onTabDrop={(tab) => {
                // 处理标签拖放到书签区域
                console.log('Dropped tab:', tab)
              }}
              onSaveAllTabs={handleSaveAllTabsToGroup}
            />
          </main>

          {/* 右侧面板 - 会话历史 + 数据管理 */}
          <aside className="sessions-panel">
            <div className="sessions-panel-header">
              <h3>📊 工具面板</h3>
              <p>数据管理 & 会话历史</p>
            </div>
            <div className="sessions-panel-content">
              <Suspense fallback={<div className="suspense-fallback">加载中…</div>}>
                <ImportExport />
                <Sessions />
              </Suspense>
            </div>
          </aside>
        </div>
      </div>

      <Suspense fallback={null}>
        <QuickLauncher />
      </Suspense>
    </div>
  )
}

export default App
