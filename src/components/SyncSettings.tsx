import React, { useState, useEffect } from 'react'
import { loadSyncConfig, saveSyncConfig, clearSyncConfigCache, loadFromGitHubGist, saveToGitHubGist, saveDataWithSync } from '../shared/storage'
import type { SyncConfig } from '../shared/types'
import { useStore } from '../store/useStore'

const SyncSettings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<SyncConfig>({
    syncMethod: 'local',
    autoSync: true
  })
  const [githubToken, setGithubToken] = useState('')
  const [githubUsername, setGithubUsername] = useState('')
  const [gistId, setGistId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'loading' | 'error'>('idle')
  
  const { spaces, activeSpaceId, sessions, isDarkMode } = useStore()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    const loadedConfig = await loadSyncConfig()
    setConfig(loadedConfig)
    setGithubToken(loadedConfig.githubToken || '')
    setGithubUsername(loadedConfig.githubUsername || '')
    setGistId(loadedConfig.gistId || '')
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSaveConfig = async () => {
    setIsLoading(true)
    try {
      const newConfig: SyncConfig = {
        ...config,
        githubToken: githubToken || undefined,
        githubUsername: githubUsername || undefined,
        gistId: gistId || undefined
      }
      
      await saveSyncConfig(newConfig)
      clearSyncConfigCache()
      setConfig(newConfig)
      showMessage('success', '同步配置已保存')
    } catch (error: any) {
      showMessage('error', `保存配置失败：${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!githubToken) {
      showMessage('error', '请先输入 GitHub Token')
      return
    }
    
    setIsLoading(true)
    try {
      // 尝试获取用户信息验证 token
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${githubToken}`,
        }
      })
      
      if (!response.ok) {
        throw new Error('GitHub Token 无效')
      }
      
      const user = await response.json()
      setGithubUsername(user.login)
      showMessage('success', `GitHub 连接成功！欢迎，${user.login}`)
    } catch (error: any) {
      showMessage('error', `GitHub 连接失败：${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncNow = async () => {
    setSyncStatus('syncing')
    try {
      const currentState: import('../shared/types').AppState = {
        spaces,
        activeSpaceId,
        sessions,
        isDarkMode
      }
      
      await saveDataWithSync(currentState)
      showMessage('success', '数据同步成功')
      setSyncStatus('idle')
    } catch (error: any) {
      showMessage('error', `同步失败：${error.message}`)
      setSyncStatus('error')
    }
  }

  const handleLoadFromCloud = async () => {
    setSyncStatus('loading')
    try {
      const loadedConfig = await loadSyncConfig()
      
      if (loadedConfig.syncMethod === 'github-gist') {
        const data = await loadFromGitHubGist(loadedConfig)
        if (data) {
          // 这里需要触发全局状态更新，使用自定义事件
          window.dispatchEvent(new CustomEvent('sync-data-loaded', { detail: data }))
          showMessage('success', '数据已从云端加载')
          setSyncStatus('idle')
        } else {
          showMessage('error', '云端没有数据')
          setSyncStatus('idle')
        }
      } else if (loadedConfig.syncMethod === 'chrome-sync') {
        // Chrome Storage Sync 的加载逻辑已经在 storage.ts 中处理
        showMessage('success', '数据已从云端加载')
        setSyncStatus('idle')
      }
    } catch (error: any) {
      showMessage('error', `加载失败：${error.message}`)
      setSyncStatus('error')
    }
  }

  const handleCreateNewGist = async () => {
    if (!githubToken) {
      showMessage('error', '请先输入 GitHub Token')
      return
    }
    
    setIsLoading(true)
    try {
      const currentState: import('../shared/types').AppState = {
        spaces,
        activeSpaceId,
        sessions,
        isDarkMode
      }
      
      await saveToGitHubGist(config, currentState)
      const newConfig = await loadSyncConfig()
      setGistId(newConfig.gistId || '')
      showMessage('success', 'Gist 创建成功')
    } catch (error: any) {
      showMessage('error', `创建 Gist 失败：${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* 设置按钮 */}
      <button 
        className="sync-settings-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="同步设置"
      >
        {syncStatus === 'syncing' || syncStatus === 'loading' ? (
          <span className="loading-spinner">☁️</span>
        ) : (
          '☁️'
        )}
      </button>

      {/* 设置面板 */}
      {isOpen && (
        <div className="sync-settings-panel">
          <div className="panel-header">
            <h3>☁️ 数据同步设置</h3>
            <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
          </div>
          
          <div className="panel-content">
            {/* 消息提示 */}
            {message && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}

            {/* 同步方式选择 */}
            <div className="setting-section">
              <label className="setting-label">同步方式</label>
              <select
                className="setting-select"
                value={config.syncMethod}
                onChange={(e) => setConfig({ ...config, syncMethod: e.target.value as any })}
              >
                <option value="local">仅本地存储</option>
                <option value="chrome-sync">Chrome 云同步（推荐）</option>
                <option value="github-gist">GitHub Gist</option>
              </select>
            </div>

            {/* Chrome Storage Sync 说明 */}
            {config.syncMethod === 'chrome-sync' && (
              <div className="setting-info">
                <p>✅ Chrome 云同步将自动在您的所有设备间同步数据</p>
                <p>⚠️ 需要登录 Chrome 浏览器并开启同步功能</p>
              </div>
            )}

            {/* GitHub Gist 配置 */}
            {config.syncMethod === 'github-gist' && (
              <div className="github-config">
                <div className="setting-section">
                  <label className="setting-label">
                    GitHub Personal Access Token
                    <span className="required">*</span>
                  </label>
                  <input
                    type="password"
                    className="setting-input"
                    placeholder="ghp_xxxxxxxxxxxx"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                  />
                  <button
                    className="test-connection-btn"
                    onClick={handleTestConnection}
                    disabled={isLoading || !githubToken}
                  >
                    测试连接
                  </button>
                </div>

                <div className="setting-section">
                  <label className="setting-label">GitHub 用户名</label>
                  <input
                    type="text"
                    className="setting-input"
                    placeholder="自动获取或手动输入"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="setting-section">
                  <label className="setting-label">Gist ID（可选）</label>
                  <input
                    type="text"
                    className="setting-input"
                    placeholder="留空将自动创建新 Gist"
                    value={gistId}
                    onChange={(e) => setGistId(e.target.value)}
                  />
                  {!gistId && (
                    <button
                      className="create-gist-btn"
                      onClick={handleCreateNewGist}
                      disabled={isLoading || !githubToken}
                    >
                      创建新 Gist
                    </button>
                  )}
                </div>

                <div className="setting-info">
                  <p>📝 <strong>如何获取 GitHub Token：</strong></p>
                  <ol>
                    <li>访问 <a href="https://github.com/settings/tokens" target="_blank">GitHub Token 设置页面</a></li>
                    <li>点击 "Generate new token (classic)"</li>
                    <li>勾选 <code>gist</code> 权限</li>
                    <li>点击 "Generate token"</li>
                    <li>复制生成的 Token 并粘贴到上方</li>
                  </ol>
                </div>
              </div>
            )}

            {/* 自动同步选项 */}
            <div className="setting-section">
              <label className="setting-checkbox">
                <input
                  type="checkbox"
                  checked={config.autoSync}
                  onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
                />
                启用自动同步
              </label>
            </div>

            {/* 操作按钮 */}
            <div className="action-buttons">
              <button
                className="save-config-btn"
                onClick={handleSaveConfig}
                disabled={isLoading || syncStatus === 'syncing' || syncStatus === 'loading'}
              >
                保存配置
              </button>
              <button
                className="sync-now-btn"
                onClick={handleSyncNow}
                disabled={isLoading || config.syncMethod === 'local' || syncStatus !== 'idle'}
              >
                {syncStatus === 'syncing' ? '同步中...' : '立即同步'}
              </button>
              <button
                className="load-cloud-btn"
                onClick={handleLoadFromCloud}
                disabled={isLoading || config.syncMethod === 'local' || syncStatus !== 'idle'}
              >
                {syncStatus === 'loading' ? '加载中...' : '从云端加载'}
              </button>
            </div>

            {/* 最后同步时间 */}
            {config.lastSyncTime && (
              <div className="last-sync-time">
                最后同步时间：{new Date(config.lastSyncTime).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default SyncSettings
