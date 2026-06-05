import React, { useState, useEffect } from 'react'
import { loadSyncConfig, saveSyncConfig, clearSyncConfigCache, loadFromChromeSync, loadFromGitHubGist, saveToGitHubGist, saveDataWithSync } from '../shared/storage'
import type { SyncConfig } from '../shared/types'
import { useStore } from '../store/useStore'
import { getChromeApi } from '../shared/chrome'

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
  const [gistIdAutoFilled, setGistIdAutoFilled] = useState(false) // 新增：跟踪 Gist ID 是否自动填充
  const [showLoadHint, setShowLoadHint] = useState(false) // 保存 Gist 配置后显示加载引导
  
  const { spaces, activeSpaceId, sessions, isDarkMode, applyAppState } = useStore()

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
    console.log('👤 用户点击"保存配置"按钮')
    setIsLoading(true)
    try {
      const newConfig: SyncConfig = {
        ...config,
        githubToken: githubToken || undefined,
        githubUsername: githubUsername || undefined,
        gistId: gistId || undefined
      }
      
      console.log('💾 保存的同步配置:', {
        同步方式: newConfig.syncMethod,
        自动同步: newConfig.autoSync,
        GistID: newConfig.gistId || '未设置',
        GitHub用户名: newConfig.githubUsername || '未设置'
      })
      
      await saveSyncConfig(newConfig)
      
      // 等待一小段时间确保配置已完全持久化到存储
      await new Promise(resolve => setTimeout(resolve, 100))
      
      clearSyncConfigCache()
      setConfig(newConfig)

      // Gist 配置保存后，提示用户从云端加载
      if (newConfig.syncMethod === 'github-gist' && newConfig.gistId) {
        showMessage('success', '配置已保存 ✅ 请点击「从云端加载」拉取 Gist 数据')
        setShowLoadHint(true)
      } else {
        showMessage('success', '同步配置已保存')
        setShowLoadHint(false)
      }
      console.log('✅ 配置保存完成，缓存已清除')
    } catch (error) {
      console.error('❌ 保存配置失败:', error)
      showMessage('error', `保存配置失败：${error instanceof Error ? error.message : '未知错误'}`)
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
      
      const user = await response.json() as { login?: string }
      setGithubUsername(user.login || '')
      showMessage('success', `GitHub 连接成功！欢迎，${user.login || 'GitHub 用户'}`)
    } catch (error) {
      showMessage('error', `GitHub 连接失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncNow = async () => {
    console.log('👤 用户点击"立即同步"按钮')
    setSyncStatus('syncing')
    try {
      const currentState: import('../shared/types').AppState = {
        spaces,
        activeSpaceId,
        sessions,
        isDarkMode
      }
      
      console.log('📊 当前状态:', {
        空间数量: spaces.length,
        会话数量: sessions.length,
        当前空间ID: activeSpaceId
      })
      
      await saveDataWithSync(currentState)
      
      // 重新加载配置以获取最新的 Gist ID（如果自动创建了新的 Gist）
      const loadedConfig = await loadSyncConfig()
      
      // 更新本地状态，确保 UI 显示最新的 Gist ID
      if (loadedConfig.syncMethod === 'github-gist') {
        setGithubToken(loadedConfig.githubToken || '')
        setGithubUsername(loadedConfig.githubUsername || '')
        
        // 如果 Gist ID 有变化，说明是自动创建的
        if (loadedConfig.gistId && loadedConfig.gistId !== gistId) {
          setGistId(loadedConfig.gistId)
          setGistIdAutoFilled(true)
          
          // 3秒后清除自动填充标记
          setTimeout(() => setGistIdAutoFilled(false), 3000)
          
          const gistUrl = `https://gist.github.com/${loadedConfig.githubUsername || 'unknown'}/${loadedConfig.gistId}`
          console.log('🔗 Gist 访问链接:', gistUrl)
          showMessage('success', `数据同步成功！已自动创建 Gist: ${loadedConfig.gistId}`)
        } else {
          setGistId(loadedConfig.gistId || '')
          if (loadedConfig.gistId) {
            const gistUrl = `https://gist.github.com/${loadedConfig.githubUsername || 'unknown'}/${loadedConfig.gistId}`
            console.log('🔗 Gist 访问链接:', gistUrl)
            showMessage('success', `数据同步成功！Gist ID: ${loadedConfig.gistId}`)
          } else {
            showMessage('success', '数据同步成功')
          }
        }
      } else {
        showMessage('success', '数据同步成功')
      }
      
      // 更新配置状态
      setConfig(loadedConfig)
      setSyncStatus('idle')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      console.error('❌ 同步失败:', errorMessage)
      
      // 针对 Gist 相关错误提供具体建议
      if (errorMessage.includes('Gist') && errorMessage.includes('不存在')) {
        showMessage('error', 'Gist 不存在，请清空 Gist ID 后重新创建')
      } else if (errorMessage.includes('Token') || errorMessage.includes('权限')) {
        showMessage('error', 'GitHub Token 无效或权限不足，请检查配置')
      } else {
        showMessage('error', `同步失败：${errorMessage}`)
      }
      
      setSyncStatus('error')
    }
  }

  const handleLoadFromCloud = async () => {
    console.log('👤 用户点击"从云端加载"按钮')
    setSyncStatus('loading')
    showMessage('success', '正在从云端加载数据...')
    
    try {
      const loadedConfig = await loadSyncConfig()
      console.log('📋 当前同步配置:', {
        同步方式: loadedConfig.syncMethod,
        自动同步: loadedConfig.autoSync,
        GistID: loadedConfig.gistId || '未设置'
      })
      
      if (loadedConfig.syncMethod === 'github-gist') {
        if (!loadedConfig.githubToken || !loadedConfig.gistId) {
          console.warn('⚠️ GitHub Gist 配置不完整')
          showMessage('error', '请先配置 GitHub Token 和 Gist ID')
          setSyncStatus('idle')
          return
        }
        
        const data = await loadFromGitHubGist(loadedConfig)
        if (data) {
          console.log('📥 准备应用从云端加载的数据...')
          await applyAppState(data)
          showMessage('success', '数据已从云端加载')
          setShowLoadHint(false)
        } else {
          console.warn('⚠️ 云端没有数据')
          showMessage('error', '云端没有数据，请先同步数据到云端')
        }
      } else if (loadedConfig.syncMethod === 'chrome-sync') {
        // 检查 Chrome Sync 状态
        const chromeApi = getChromeApi()
        if (chromeApi?.storage?.sync) {
          console.log('✅ Chrome Storage Sync API 可用')
          
          // 尝试读取所有相关键，用于诊断
          chromeApi.storage.sync.get(null, (allItems: Record<string, unknown> | undefined) => {
            if (chromeApi.runtime.lastError) {
              console.error('❌ 无法访问 Chrome Storage Sync:', chromeApi.runtime.lastError.message)
              console.error('💡 请检查：')
              console.error('   1. 是否已登录 Chrome 账号')
              console.error('   2. 是否在 chrome://settings/syncSetup 中启用了同步')
              console.error('   3. 是否在 chrome://settings/syncSetup/advanced 中启用了"扩展程序"同步')
            } else {
              const allKeys = Object.keys(allItems || {})
              const tabManagerKeys = allKeys.filter(k => k.startsWith('tab-manager-data'))
              console.log('📊 Chrome Storage Sync 诊断:')
              console.log('  - 总键数量:', allKeys.length)
              console.log('  - Tab Manager 相关键:', tabManagerKeys)
              
              if (tabManagerKeys.length === 0) {
                console.warn('⚠️ 未在 Chrome Sync 中找到任何 Tab Manager 数据')
                console.warn('💡 可能原因：')
                console.warn('   1. 从未在此设备上执行过"立即同步"')
                console.warn('   2. 使用了不同的 Chrome 账号')
                console.warn('   3. Chrome Sync 中"扩展程序"同步被禁用')
                console.warn('   4. 数据同步延迟，请等待几分钟后重试')
                console.warn('   5. 之前卸载时选择了"清除数据"')
              } else {
                console.log('✅ 找到 Tab Manager 数据，继续加载...')
              }
            }
          })
        } else {
          console.error('❌ Chrome Storage Sync API 不可用')
        }
        
        const data = await loadFromChromeSync()
        if (data) {
          console.log('📥 准备应用从云端加载的数据...')
          await applyAppState(data)
          showMessage('success', '数据已从云端加载')
        } else {
          console.warn('⚠️ 云端没有数据')
          showMessage('error', '云端没有数据，请先同步数据到云端')
        }
      }
      setSyncStatus('idle')
    } catch (error) {
      console.error('❌ 从云端加载失败:', error)
      showMessage('error', `加载失败：${error instanceof Error ? error.message : '未知错误'}`)
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
    } catch (error) {
      showMessage('error', `创建 Gist 失败：${error instanceof Error ? error.message : '未知错误'}`)
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
                onChange={(e) => setConfig({ ...config, syncMethod: e.target.value as SyncConfig['syncMethod'] })}
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
                  <label className="setting-label">
                    Gist ID
                    {gistIdAutoFilled && <span className="auto-filled-badge">✨ 已自动填充</span>}
                  </label>
                  <input
                    type="text"
                    className={`setting-input ${gistIdAutoFilled ? 'auto-filled' : ''}`}
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
                  {gistIdAutoFilled && (
                    <p className="auto-filled-hint">
                      💡 Gist ID 已自动填充，下次同步将使用此 ID
                    </p>
                  )}
                </div>

                <div className="setting-info">
                  <p>📝 <strong>如何获取 GitHub Token：</strong></p>
                  <ol>
                    <li>访问 <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer">GitHub Token 设置页面</a></li>
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

            {/* Gist 配置保存后的加载引导 */}
            {showLoadHint && config.syncMethod === 'github-gist' && config.gistId && (
              <div className="load-hint-section">
                <div className="load-hint-icon">📥</div>
                <div className="load-hint-text">
                  <strong>Gist 配置已就绪</strong>
                  <p>检测到已配置 Gist ID，是否从云端拉取数据？</p>
                </div>
                <button
                  className="load-hint-btn"
                  onClick={handleLoadFromCloud}
                  disabled={isLoading || syncStatus === 'loading'}
                >
                  {syncStatus === 'loading' ? '加载中...' : '从云端加载'}
                </button>
                <button
                  className="load-hint-dismiss"
                  onClick={() => setShowLoadHint(false)}
                  title="忽略"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 最后同步时间和 Gist 链接 */}
            {config.lastSyncTime && (
              <div className="last-sync-info">
                <div className="last-sync-time">
                  🕒 最后同步时间：{new Date(config.lastSyncTime).toLocaleString()}
                </div>
                
                {config.syncMethod === 'github-gist' && config.gistId && (
                  <div className="gist-link">
                    🔗 <a 
                      href={`https://gist.github.com/${config.githubUsername || 'unknown'}/${config.gistId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="gist-url"
                    >
                      在 GitHub 上查看 Gist
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default SyncSettings
