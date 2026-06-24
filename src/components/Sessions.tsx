import { useState } from 'react'
import { useStore } from '../store/useStore'
import { removeSession as removeSessionLocal } from '../shared/sessions'
import type { TabSession } from '../shared/types'
import { getChromeApi } from '../shared/chrome'

type RestoreSessionResponse = {
  success: boolean
  reason?: string
}

export default function Sessions() {
  const sessions = useStore(state => state.sessions)
  const initialize = useStore(state => state.initialize)
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  const restore = async (session: TabSession) => {
    const chromeApi = getChromeApi()
    if (!chromeApi?.runtime) {
      alert('当前环境不支持恢复会话')
      return
    }

    try {
      chromeApi.runtime.sendMessage(
        { action: 'restore-session', sessionId: session.id }, 
        (resp?: RestoreSessionResponse) => {
          if (resp && resp.success) {
            alert(`✅ 已开始恢复会话 "${session.name}"，共 ${session.tabs.length} 个标签页`)
          } else {
            alert('❌ 恢复失败：' + (resp?.reason || '未知'))
          }
        }
      )
    } catch (error) {
      console.error('恢复失败:', error)
      alert('❌ 恢复失败，请重试')
    }
  }

  const removeSession = async (id: string, name: string) => {
    if (!confirm(`确定要删除会话 "${name}" 吗？`)) return
    try {
      await removeSessionLocal(id)
      await initialize()
    } catch (error) {
      console.error('删除失败:', error)
      alert('❌ 删除失败，请重试')
    }
  }

  const toggleExpand = (sessionId: string) => {
    setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays === 1) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) + 
             ` ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    }
  }

  return (
    <div className="sessions-section">
      <div className="section-header">
        <h3>📜 会话历史</h3>
        <p className="section-desc">已保存的浏览器会话记录</p>
      </div>
      
      {sessions.length === 0 ? (
        <div className="empty-sessions">
          <div className="empty-icon">📭</div>
          <p>暂无已保存的会话</p>
          <p className="empty-hint">在顶部保存当前打开的所有标签页</p>
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map((session) => (
            <div 
              key={session.id} 
              className={`session-card ${expandedSessionId === session.id ? 'expanded' : ''}`}
            >
              <div className="session-header" onClick={() => toggleExpand(session.id)}>
                <div className="session-info">
                  <div className="session-name">{session.name}</div>
                  <div className="session-meta">
                    <span className="session-time">{formatDate(session.savedAt)}</span>
                    <span className="session-count">· {session.tabs.length} 个标签页</span>
                  </div>
                </div>
                <button className="expand-btn" title={expandedSessionId === session.id ? '收起' : '展开'}>
                  {expandedSessionId === session.id ? '▲' : '▼'}
                </button>
              </div>
              
              {expandedSessionId === session.id && (
                <div className="session-details">
                  <div className="tabs-preview">
                    {session.tabs.map((tab, idx) => (
                      <div key={idx} className="tab-preview-item" title={tab.title}>
                        {tab.favicon && (
                          <img src={tab.favicon} alt="" className="tab-favicon-small" />
                        )}
                        <span className="tab-title-small">{tab.title}</span>
                      </div>
                    ))}
                    {/* {session.tabs.length > 5 && (
                      <div className="more-tabs-hint">
                        还有 {session.tabs.length - 5} 个标签页...
                      </div>
                    )} */}
                  </div>
                  <div className="session-actions">
                    <button 
                      className="action-btn restore-btn"
                      onClick={() => restore(session)}
                    >
                      🔄 恢复此会话
                    </button>
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => removeSession(session.id, session.name)}
                    >
                      🗑️ 删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
