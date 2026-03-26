import type { AppState, Space, SyncConfig } from './types'
import { DEFAULT_SPACES, DEFAULT_ACTIVE_SPACE_ID } from './defaultData'

const STORAGE_KEY = 'tab-manager-data'
const SYNC_CONFIG_KEY = 'tab-manager-sync-config'

// 检测是否在 Chrome 扩展环境中
const isChromeExtension = typeof (window as any).chrome !== 'undefined' && (window as any).chrome.storage

// ==================== Chrome Storage Sync 方案 ====================
export async function saveToChromeSync(state: AppState): Promise<void> {
  if (!isChromeExtension) {
    throw new Error('不在 Chrome 扩展环境中')
  }
  
  return new Promise((resolve, reject) => {
    ;(window as any).chrome.storage.sync.set({ [STORAGE_KEY]: state }, () => {
      if ((window as any).chrome.runtime.lastError) {
        reject(new Error(`Chrome Storage Sync 失败：${(window as any).chrome.runtime.lastError.message}`))
      } else {
        resolve()
      }
    })
  })
}

export async function loadFromChromeSync(): Promise<AppState | null> {
  if (!isChromeExtension) {
    return null
  }
  
  return new Promise((resolve) => {
    ;(window as any).chrome.storage.sync.get(STORAGE_KEY, (result: any) => {
      resolve(result[STORAGE_KEY] || null)
    })
  })
}

// ==================== GitHub Gist 方案 ====================
const GIST_FILENAME = 'tab-manager-data.json'

async function createGist(token: string, content: AppState): Promise<string> {
  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: 'Tab Manager Backup - Auto Sync',
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(content, null, 2)
        }
      }
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(`创建 Gist 失败：${error.message}`)
  }
  
  const data = await response.json()
  return data.id
}

async function updateGist(token: string, gistId: string, content: AppState): Promise<void> {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(content, null, 2)
        }
      }
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(`更新 Gist 失败：${error.message}`)
  }
}

async function getGist(token: string, gistId: string): Promise<AppState | null> {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      'Authorization': `token ${token}`,
    }
  })
  
  if (!response.ok) {
    console.error('获取 Gist 失败，状态码:', response.status)
    return null
  }
  
  const data = await response.json()
  const fileContent = data.files[GIST_FILENAME]?.content
  
  if (!fileContent) {
    console.warn('Gist 中未找到数据文件')
    return null
  }
  
  try {
    return JSON.parse(fileContent)
  } catch (e) {
    console.error('解析 Gist 数据失败:', e)
    return null
  }
}

export async function saveToGitHubGist(config: SyncConfig, state: AppState): Promise<void> {
  if (!config.githubToken) {
    throw new Error('未配置 GitHub Token')
  }
  
  if (config.gistId) {
    // 更新已有 Gist
    await updateGist(config.githubToken, config.gistId, state)
  } else {
    // 创建新 Gist
    const gistId = await createGist(config.githubToken, state)
    // 保存 gistId 到配置
    config.gistId = gistId
    await saveSyncConfig(config)
  }
}

export async function loadFromGitHubGist(config: SyncConfig): Promise<AppState | null> {
  if (!config.githubToken || !config.gistId) {
    return null
  }
  
  return await getGist(config.githubToken, config.gistId)
}

// ==================== Sync Config 管理 ====================
export async function saveSyncConfig(config: SyncConfig): Promise<void> {
  if (isChromeExtension) {
    return new Promise((resolve) => {
      ;(window as any).chrome.storage.local.set({ [SYNC_CONFIG_KEY]: config }, () => {
        resolve()
      })
    })
  } else {
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config))
  }
}

export async function loadSyncConfig(): Promise<SyncConfig> {
  const defaultConfig: SyncConfig = {
    syncMethod: 'local',
    autoSync: true
  }
  
  if (isChromeExtension) {
    return new Promise((resolve) => {
      ;(window as any).chrome.storage.local.get(SYNC_CONFIG_KEY, (result: any) => {
        resolve(result[SYNC_CONFIG_KEY] || defaultConfig)
      })
    })
  } else {
    const stored = localStorage.getItem(SYNC_CONFIG_KEY)
    return stored ? JSON.parse(stored) : defaultConfig
  }
}

// ==================== 原有的本地存储方法（保留兼容性）====================
export async function loadData(): Promise<AppState> {
  if (isChromeExtension) {
    return new Promise((resolve) => {
      ;(window as any).chrome.storage.local.get(STORAGE_KEY, (result: any) => {
        if (result[STORAGE_KEY]) {
          resolve(result[STORAGE_KEY])
        } else {
          // 初始化默认数据
          const defaultState: AppState = {
            spaces: DEFAULT_SPACES,
            activeSpaceId: DEFAULT_ACTIVE_SPACE_ID,
            sessions: [],
            isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
          }
          ;(window as any).chrome.storage.local.set({ [STORAGE_KEY]: defaultState })
          resolve(defaultState)
        }
      })
    })
  } else {
    // 开发环境使用 localStorage
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
    const defaultState: AppState = {
      spaces: DEFAULT_SPACES,
      activeSpaceId: DEFAULT_ACTIVE_SPACE_ID,
      sessions: [],
      isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState))
    return defaultState
  }
}

export async function saveData(state: AppState): Promise<void> {
  return debouncedSave(state)
}

// Immediately write to storage (no debounce). 返回完成写入的 Promise。
export async function saveDataImmediate(state: AppState): Promise<void> {
  return performWrite(state)
}

const DEBOUNCE_MS = 800
let pendingState: AppState | null = null
let saveTimer: number | null = null
let pendingResolvers: Array<() => void> = []

function debouncedSave(state: AppState): Promise<void> {
  pendingState = state

  return new Promise((resolve) => {
    pendingResolvers.push(resolve)

    if (saveTimer) {
      clearTimeout(saveTimer)
    }

    saveTimer = window.setTimeout(async () => {
      const toSave = pendingState!
      pendingState = null
      saveTimer = null
      try {
        await performWrite(toSave)
        const resolvers = pendingResolvers.slice()
        pendingResolvers = []
        resolvers.forEach(r => r())
      } catch (e) {
        // still resolve callers to avoid hanging; errors can be logged by caller
        const resolvers = pendingResolvers.slice()
        pendingResolvers = []
        resolvers.forEach(r => r())
      }
    }, DEBOUNCE_MS)
  })
}

function performWrite(state: AppState): Promise<void> {
  if (isChromeExtension) {
    return new Promise((resolve) => {
      ;(window as any).chrome.storage.local.set({ [STORAGE_KEY]: state }, () => {
        resolve()
      })
    })
  } else {
    return new Promise((resolve) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      resolve()
    })
  }
}

// 便捷方法：更新 spaces
export async function updateSpaces(spaces: Space[]): Promise<void> {
  const state = await loadData()
  state.spaces = spaces
  await saveData(state)
}

// 便捷方法：更新 activeSpaceId
export async function setActiveSpace(spaceId: string): Promise<void> {
  const state = await loadData()
  state.activeSpaceId = spaceId
  await saveData(state)
}

// 便捷方法：添加书签
export async function addBookmark(
  spaceId: string,
  groupId: string,
  bookmark: Omit<import('./types').BookmarkItem, 'id' | 'addedAt'>
): Promise<void> {
  const state = await loadData()
  const space = state.spaces.find(s => s.id === spaceId)
  if (space) {
    const group = space.groups.find(g => g.id === groupId)
    if (group) {
      group.items.push({
        ...bookmark,
        id: `bm-${Date.now()}`,
        addedAt: Date.now()
      })
    }
  }
  await saveData(state)
}

// 便捷方法：删除书签
export async function removeBookmark(spaceId: string, groupId: string, bookmarkId: string): Promise<void> {
  const state = await loadData()
  const space = state.spaces.find(s => s.id === spaceId)
  if (space) {
    const group = space.groups.find(g => g.id === groupId)
    if (group) {
      group.items = group.items.filter(item => item.id !== bookmarkId)
    }
  }
  await saveData(state)
}

// 便捷方法：添加分组
export async function addGroup(spaceId: string, groupName: string): Promise<void> {
  const state = await loadData()
  const space = state.spaces.find(s => s.id === spaceId)
  if (space) {
    space.groups.push({
      id: `group-${Date.now()}`,
      name: groupName,
      items: [],
      collapsed: false
    })
  }
  await saveData(state)
}

// 便捷方法：添加 Space
export async function addSpace(name: string, icon: string, color: string): Promise<void> {
  const state = await loadData()
  state.spaces.push({
    id: `space-${Date.now()}`,
    name,
    icon,
    color,
    groups: [],
    createdAt: Date.now()
  })
  await saveData(state)
}

// 保存当前标签会话
export async function saveCurrentSession(name: string, tabs: { url: string; title: string; favicon: string }[]): Promise<void> {
  const state = await loadData()
  state.sessions.push({
    id: `session-${Date.now()}`,
    name,
    tabs,
    savedAt: Date.now()
  })
  await saveData(state)
}

export async function exportData(): Promise<string> {
  const state = await loadData()
  return JSON.stringify(state, null, 2)
}

export async function importData(json: string): Promise<void> {
  const parsed = JSON.parse(json)
  await saveData(parsed)
}

export async function removeSession(sessionId: string): Promise<void> {
  const state = await loadData()
  state.sessions = state.sessions.filter(s => s.id !== sessionId)
  await saveData(state)
}

// ==================== 新增：统一的数据加载和保存（支持同步配置）====================
let cachedSyncConfig: SyncConfig | null = null

/**
 * 获取当前的同步配置（带缓存）
 */
export async function getSyncConfig(): Promise<SyncConfig> {
  if (cachedSyncConfig) {
    return cachedSyncConfig
  }
  cachedSyncConfig = await loadSyncConfig()
  return cachedSyncConfig
}

/**
 * 清除同步配置缓存
 */
export function clearSyncConfigCache() {
  cachedSyncConfig = null
}

/**
 * 统一的加载数据方法（根据同步配置选择数据源）
 */
export async function loadDataWithSync(): Promise<AppState> {
  const config = await getSyncConfig()
  
  // 根据同步方式加载数据
  if (config.syncMethod === 'chrome-sync' && isChromeExtension) {
    const data = await loadFromChromeSync()
    if (data) {
      console.log('从 Chrome Storage Sync 加载数据')
      return data
    }
  } else if (config.syncMethod === 'github-gist') {
    const data = await loadFromGitHubGist(config)
    if (data) {
      console.log('从 GitHub Gist 加载数据')
      return data
    }
  }
  
  // 回退到本地存储
  console.log('从本地存储加载数据')
  return await loadData()
}

/**
 * 统一的保存数据方法（根据同步配置保存到远程）
 */
export async function saveDataWithSync(state: AppState): Promise<void> {
  const config = await getSyncConfig()
  
  try {
    // 根据同步方式保存数据
    if (config.syncMethod === 'chrome-sync' && isChromeExtension) {
      await saveToChromeSync(state)
      console.log('数据已保存到 Chrome Storage Sync')
    } else if (config.syncMethod === 'github-gist') {
      await saveToGitHubGist(config, state)
      console.log('数据已保存到 GitHub Gist')
    }
    
    // 无论哪种方式，都同时保存到本地作为备份
    await performWrite(state)
    
    // 更新最后同步时间
    if (config.autoSync) {
      config.lastSyncTime = Date.now()
      await saveSyncConfig(config)
    }
  } catch (error) {
    console.error('同步失败:', error)
    // 同步失败时至少保存到本地
    await performWrite(state)
    throw error
  }
}
