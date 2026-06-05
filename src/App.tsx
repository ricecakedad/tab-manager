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
import { getChromeApi } from './shared/chrome'

function toTabInfo(tab: chrome.tabs.Tab): TabInfo | null {
  if (tab.id === undefined || !tab.url) {
    return null
  }

  return {
    id: tab.id,
    title: tab.title || tab.url,
    url: tab.url,
    favicon: tab.favIconUrl || '',
    active: !!tab.active
  }
}

function App() {
  const { spaces, activeSpaceId, initialize, setActiveSpace, addSpace, addBookmark } = useStore()
  const [name, setName] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false) // 默认打开侧边栏
  const [rightPanelOpen, setRightPanelOpen] = useState(false) // 右侧面板默认打开
  const [openTabs, setOpenTabs] = useState<TabInfo[]>([])
  const sidebarRef = useRef<HTMLDivElement>(null)
  const sidebarTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    initialize()
    
    // 获取所有打开的标签
    const chromeApi = getChromeApi()
    if (chromeApi?.tabs) {
      chromeApi.tabs.query({}, (tabs) => {
        setOpenTabs(tabs.map(toTabInfo).filter((tab): tab is TabInfo => tab !== null))
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
    const chromeApi = getChromeApi()
    if (chromeApi?.tabs) {
      const tabs = await chromeApi.tabs.query({ currentWindow: true })
      const sessionTabs = tabs
        .filter((tab): tab is chrome.tabs.Tab & { url: string } => !!tab.url)
        .map((tab) => ({
          url: tab.url,
          title: tab.title || tab.url,
          favicon: tab.favIconUrl || ''
        }))

      await saveSessionLocal(sessionName, sessionTabs)
      await initialize()
      alert(`已保存会话，共 ${sessionTabs.length} 个标签页`)
      return
    }
    await saveSessionLocal(sessionName, openTabs.map((tab) => ({
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon
    })))
    await initialize()
    alert('已在本地保存会话（开发模式）')
  }

  const handleAddSpace = async () => {
    const n = prompt('新 Space 名称')
    if (n) await addSpace(n, '🗂', '#888')
  }

  const handleTabClick = (tab: TabInfo) => {
    const chromeApi = getChromeApi()
    if (chromeApi?.tabs) {
      chromeApi.tabs.update(tab.id, { active: true })
    }
  }

  const handleTabDragStart = (e: React.DragEvent, tab: TabInfo) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'tab', data: tab }))
    e.dataTransfer.effectAllowed = 'copyMove'
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

      {/* 左侧侧边栏关闭时的悬浮按钮 */}
      {!sidebarOpen && (
        <button
          className="sidebar-floating-btn"
          onClick={() => setSidebarOpen(true)}
          title="打开标签面板"
        >
          ☰
        </button>
      )}

      {/* 主内容区域 */}
      <div className="main-content">
        {/* 顶部导航栏 */}
        <header className="top-header">
          <div className="header-left">
            {sidebarOpen && (
              <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)}>
                ☰
              </button>
            )}
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
                setOpenTabs(prev => prev.filter(t => t.id !== tab.id))
                const chromeApi = getChromeApi()
                if (chromeApi?.tabs) {
                  chromeApi.tabs.remove(tab.id)
                }
              }}
              onSaveAllTabs={handleSaveAllTabsToGroup}
            />
          </main>

          {/* 右侧面板 - 会话历史 + 数据管理 */}
          <aside className={`sessions-panel ${rightPanelOpen ? 'panel-open' : 'panel-closed'}`}>
            <div className="sessions-panel-header">
              <div className="panel-header-left">
                <h3>📊 工具面板</h3>
                <p>数据管理 & 会话历史</p>
              </div>
              <button 
                className="panel-toggle-btn"
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                title={rightPanelOpen ? '关闭面板' : '打开面板'}
              >
                {rightPanelOpen ? '✕' : '📊'}
              </button>
            </div>
            {rightPanelOpen && (
              <div className="sessions-panel-content">
                <Suspense fallback={<div className="suspense-fallback">加载中…</div>}>
                  <ImportExport />
                  <Sessions />
                </Suspense>
              </div>
            )}
          </aside>
        </div>

        {/* 右侧面板关闭时的提示按钮 */}
        {!rightPanelOpen && (
          <button 
            className="right-panel-open-btn"
            onClick={() => setRightPanelOpen(true)}
            title="打开工具面板"
          >
            📊
          </button>
        )}
      </div>

      <Suspense fallback={null}>
        <QuickLauncher />
      </Suspense>
    </div>
  )
}

export default App
