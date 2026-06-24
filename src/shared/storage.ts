import type { AppState, SyncConfig } from './types'
import { getChromeApi } from './chrome'
import { loadData, performWrite, STORAGE_KEY } from './localData'

export { loadData, saveData, saveDataImmediate } from './localData'

const SYNC_CONFIG_KEY = 'tab-manager-sync-config'
const SYNC_META_KEY = `${STORAGE_KEY}-sync-meta`
const SYNC_CHUNK_PREFIX = `${STORAGE_KEY}-sync-chunk-`
const SYNC_CHUNK_SIZE = 6000

// 检测是否在 Chrome 扩展环境中
const isChromeExtension = !!getChromeApi()?.storage

type SyncChunkMeta = {
  chunkCount: number
  updatedAt: number
  version: 1
}

function buildSyncChunkKeys(chunkCount: number): string[] {
  return Array.from({ length: chunkCount }, (_, index) => `${SYNC_CHUNK_PREFIX}${index}`)
}

function getSyncMeta(result: Record<string, unknown>): SyncChunkMeta | null {
  const raw = result[SYNC_META_KEY]
  if (!raw || typeof raw !== 'object') return null
  const meta = raw as Partial<SyncChunkMeta>
  if (typeof meta.chunkCount !== 'number' || meta.chunkCount <= 0) return null
  return {
    chunkCount: meta.chunkCount,
    updatedAt: typeof meta.updatedAt === 'number' ? meta.updatedAt : Date.now(),
    version: 1
  }
}

// ==================== Chrome Storage Sync 方案 ====================
export async function saveToChromeSync(state: AppState): Promise<void> {
  const chromeApi = getChromeApi()
  if (!chromeApi?.storage?.sync) {
    throw new Error('不在 Chrome 扩展环境中')
  }

  console.log('📤 开始保存到 Chrome Storage Sync...')
  console.log('  - 空间数量:', state.spaces.length)
  console.log('  - 会话数量:', state.sessions.length)
  console.log('  - 当前空间ID:', state.activeSpaceId)
  
  const serialized = JSON.stringify(state)
  console.log('  - 数据大小:', (serialized.length / 1024).toFixed(2), 'KB')
  
  const chunks: string[] = []
  for (let offset = 0; offset < serialized.length; offset += SYNC_CHUNK_SIZE) {
    chunks.push(serialized.slice(offset, offset + SYNC_CHUNK_SIZE))
  }

  const chunkCount = chunks.length
  console.log('  - 分片数量:', chunkCount)
  
  const payload: Record<string, string | SyncChunkMeta> = {
    [SYNC_META_KEY]: {
      chunkCount,
      updatedAt: Date.now(),
      version: 1
    }
  }

  chunks.forEach((chunk, index) => {
    payload[`${SYNC_CHUNK_PREFIX}${index}`] = chunk
  })

  const oldMeta = await new Promise<SyncChunkMeta | null>((resolve) => {
    chromeApi.storage.sync.get(SYNC_META_KEY, (result) => {
      resolve(getSyncMeta(result))
    })
  })

  await new Promise<void>((resolve, reject) => {
    chromeApi.storage.sync.set(payload, () => {
      if (chromeApi.runtime.lastError) {
        console.error('❌ Chrome Storage Sync 保存失败:', chromeApi.runtime.lastError.message)
        reject(new Error(`Chrome Storage Sync 失败：${chromeApi.runtime.lastError.message}`))
      } else {
        console.log('✅ Chrome Storage Sync 保存成功')
        resolve()
      }
    })
  })

  const removeKeys: string[] = [STORAGE_KEY]
  if (oldMeta && oldMeta.chunkCount > chunkCount) {
    const staleChunkKeys = buildSyncChunkKeys(oldMeta.chunkCount).slice(chunkCount)
    removeKeys.push(...staleChunkKeys)
  }

  if (removeKeys.length === 0) return

  await new Promise<void>((resolve) => {
    chromeApi.storage.sync.remove(removeKeys, () => {
      if (removeKeys.length > 1) {
        console.log('  - 清理旧分片:', removeKeys.length - 1, '个')
      }
      resolve()
    })
  })
}

export async function loadFromChromeSync(): Promise<AppState | null> {
  const chromeApi = getChromeApi()
  if (!chromeApi?.storage?.sync) {
    console.log('⚠️ 不在 Chrome 扩展环境中，跳过 Chrome Sync 加载')
    return null
  }

  console.log('📥 开始从 Chrome Storage Sync 加载数据...')
  
  // 检查 Chrome Sync 是否可用
  console.log('🔍 诊断信息:')
  console.log('  - Chrome API 可用:', !!chromeApi)
  console.log('  - Storage API 可用:', !!chromeApi.storage)
  console.log('  - Sync Storage 可用:', !!chromeApi.storage.sync)

  // 添加超时保护，防止一直加载
  const TIMEOUT_MS = 10000 // 10秒超时
  
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      console.warn('⏰ 从 Chrome Sync 加载数据超时（10秒）')
      console.warn('💡 可能原因：')
      console.warn('   1. Chrome Sync 同步延迟，请稍后再试')
      console.warn('   2. 网络连接问题')
      console.warn('   3. Chrome 账号未登录或 Sync 被禁用')
      resolve(null)
    }, TIMEOUT_MS)

    chromeApi.storage.sync.get([STORAGE_KEY, SYNC_META_KEY], (result) => {
      if (chromeApi.runtime.lastError) {
        clearTimeout(timeoutId)
        console.error('❌ 读取 Chrome Sync 元信息失败:', chromeApi.runtime.lastError.message)
        console.error('💡 可能原因：')
        console.error('   1. Chrome Sync 服务暂时不可用')
        console.error('   2. 网络连接问题')
        resolve(null)
        return
      }

      if (!result || typeof result !== 'object') {
        clearTimeout(timeoutId)
        console.log('⚠️ Chrome Sync 返回结果为空')
        console.log('💡 可能原因：')
        console.log('   1. 从未同步过数据到云端')
        console.log('   2. Chrome Sync 同步延迟，请稍后再试')
        console.log('   3. 使用了不同的 Chrome 账号')
        console.log('   4. Chrome Sync 中扩展数据同步被禁用')
        resolve(null)
        return
      }

      console.log('  - 读取到的键:', Object.keys(result))

      // 兼容旧版本：单 key 存储
      const legacyState = result[STORAGE_KEY] as AppState | undefined
      if (legacyState) {
        clearTimeout(timeoutId)
        console.log('✅ 从 Chrome Sync 加载数据成功（旧版格式）')
        console.log('  - 空间数量:', legacyState.spaces.length)
        console.log('  - 会话数量:', legacyState.sessions.length)
        console.log('  - 当前空间ID:', legacyState.activeSpaceId)
        resolve(legacyState)
        return
      }

      const meta = getSyncMeta(result)
      if (!meta) {
        clearTimeout(timeoutId)
        console.log('⚠️ Chrome Sync 中未找到有效的元数据')
        console.log('  - STORAGE_KEY 存在:', !!result[STORAGE_KEY])
        console.log('  - SYNC_META_KEY 存在:', !!result[SYNC_META_KEY])
        console.log('💡 可能原因：')
        console.log('   1. 从未执行过"立即同步"操作')
        console.log('   2. 数据已被清除或删除')
        console.log('   3. Chrome Sync 同步尚未完成')
        resolve(null)
        return
      }

      console.log('  - 检测到分片数据，分片数量:', meta.chunkCount)
      console.log('  - 最后更新时间:', new Date(meta.updatedAt).toLocaleString())

      // Chrome sync 总键数量有限，异常值直接中止，避免 get 卡住
      if (!Number.isFinite(meta.chunkCount) || meta.chunkCount <= 0 || meta.chunkCount > 400) {
        clearTimeout(timeoutId)
        console.warn('⚠️ Chrome Sync 分片数量异常:', meta.chunkCount)
        resolve(null)
        return
      }

      const chunkKeys = buildSyncChunkKeys(meta.chunkCount)
      console.log('  - 准备读取分片键:', chunkKeys)
      
      chromeApi.storage.sync.get(chunkKeys, (chunkResult) => {
        clearTimeout(timeoutId)
        
        if (chromeApi.runtime.lastError) {
          console.error('❌ 读取 Chrome Sync 数据分片失败:', chromeApi.runtime.lastError.message)
          resolve(null)
          return
        }

        if (!chunkResult || typeof chunkResult !== 'object') {
          console.log('⚠️ Chrome Sync 分片数据为空')
          resolve(null)
          return
        }

        console.log('  - 成功读取的分片数量:', Object.keys(chunkResult).length)

        const missingChunk = chunkKeys.find((key) => typeof chunkResult[key] !== 'string')
        if (missingChunk) {
          console.warn('⚠️ Chrome Sync 数据分片不完整，缺少:', missingChunk)
          console.warn('  - 期望分片数:', chunkKeys.length)
          console.warn('  - 实际读取数:', Object.keys(chunkResult).filter(k => typeof chunkResult[k] === 'string').length)
          resolve(null)
          return
        }

        const serialized = chunkKeys.map((key) => chunkResult[key] as string).join('')
        console.log('  - 数据大小:', (serialized.length / 1024).toFixed(2), 'KB')
        
        try {
          const state = JSON.parse(serialized) as AppState
          console.log('✅ 从 Chrome Sync 加载数据成功（分片格式）')
          console.log('  - 空间数量:', state.spaces.length)
          console.log('  - 会话数量:', state.sessions.length)
          console.log('  - 当前空间ID:', state.activeSpaceId)
          resolve(state)
        } catch (error) {
          console.error('❌ 解析 Chrome Sync 数据失败:', error)
          resolve(null)
        }
      })
    })
  })
}

// ==================== GitHub Gist 方案 ====================
const GIST_FILENAME = 'tab-manager-data.json'

async function createGist(token: string, content: AppState): Promise<string> {
  console.log('📤 开始创建 GitHub Gist...')
  console.log('  - 空间数量:', content.spaces.length)
  console.log('  - 会话数量:', content.sessions.length)
  
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
    const error = await response.json() as { message?: string }
    console.error('❌ 创建 Gist 失败:', error.message)
    throw new Error(`创建 Gist 失败：${error.message}`)
  }
  
  const data = await response.json() as { id: string }
  console.log('✅ Gist 创建成功，ID:', data.id)
  return data.id
}

async function updateGist(token: string, gistId: string, content: AppState): Promise<void> {
  console.log('📤 开始更新 GitHub Gist...')
  console.log('  - Gist ID:', gistId)
  console.log('  - 空间数量:', content.spaces.length)
  console.log('  - 会话数量:', content.sessions.length)
  
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
    const error = await response.json() as { message?: string }
    console.error('❌ 更新 Gist 失败:', error.message)
    console.error('  - 状态码:', response.status)
    console.error('  - Gist ID:', gistId)
    
    // 如果是 404，说明 Gist 不存在，建议用户重新创建
    if (response.status === 404) {
      console.warn('⚠️ Gist 不存在，可能已被删除或 ID 错误')
      console.warn('💡 解决方案：')
      console.warn('   1. 在同步设置中清空 Gist ID 字段')
      console.warn('   2. 点击"创建新 Gist"按钮')
      console.warn('   3. 或者手动输入正确的 Gist ID')
      throw new Error(`Gist "${gistId}" 不存在。请在同步设置中清空 Gist ID 并重新创建，或输入正确的 Gist ID。`)
    }
    
    // 如果是 403，说明权限不足
    if (response.status === 403) {
      console.error('❌ 权限不足，请检查 GitHub Token 是否有效且有 gist 权限')
      throw new Error('GitHub Token 无效或权限不足。请检查 Token 是否正确，并确保有 "gist" 权限。')
    }
    
    throw new Error(`更新 Gist 失败：${error.message}`)
  }
  
  console.log('✅ Gist 更新成功')
}

async function getGist(token: string, gistId: string): Promise<AppState | null> {
  console.log('📥 开始从 GitHub Gist 加载数据...')
  console.log('  - Gist ID:', gistId)
  
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      'Authorization': `token ${token}`,
    }
  })
  
  if (!response.ok) {
    console.error('❌ 获取 Gist 失败，状态码:', response.status)
    return null
  }
  
  const data = await response.json() as { files?: Record<string, { content?: string }> }
  const fileContent = data.files?.[GIST_FILENAME]?.content
  
  if (!fileContent) {
    console.warn('⚠️ Gist 中未找到数据文件')
    return null
  }
  
  try {
    const state = JSON.parse(fileContent) as AppState
    console.log('✅ 从 GitHub Gist 加载数据成功')
    console.log('  - 空间数量:', state.spaces.length)
    console.log('  - 会话数量:', state.sessions.length)
    console.log('  - 当前空间ID:', state.activeSpaceId)
    return state
  } catch (error) {
    console.error('❌ 解析 Gist 数据失败:', error)
    return null
  }
}

export async function saveToGitHubGist(config: SyncConfig, state: AppState): Promise<void> {
  if (!config.githubToken) {
    throw new Error('未配置 GitHub Token')
  }
  
  console.log('🔄 开始保存到 GitHub Gist...')
  
  if (config.gistId) {
    // 更新已有 Gist
    console.log('  - 模式: 更新现有 Gist')
    try {
      await updateGist(config.githubToken, config.gistId, state)
    } catch (error) {
      // 如果更新失败且错误信息包含 "不存在"，则自动创建新的 Gist
      if (error instanceof Error && error.message.includes('不存在')) {
        console.warn('⚠️ 检测到 Gist 不存在，自动创建新的 Gist...')
        const gistId = await createGist(config.githubToken, state)
        config.gistId = gistId
        await saveSyncConfig(config)
        console.log('✅ 已创建新 Gist 并更新配置，ID:', gistId)
        return
      }
      // 其他错误继续抛出
      throw error
    }
  } else {
    // 创建新 Gist
    console.log('  - 模式: 创建新 Gist')
    const gistId = await createGist(config.githubToken, state)
    // 保存 gistId 到配置
    config.gistId = gistId
    await saveSyncConfig(config)
  }
  
  console.log('✅ GitHub Gist 保存完成')
}

export async function loadFromGitHubGist(config: SyncConfig): Promise<AppState | null> {
  if (!config.githubToken || !config.gistId) {
    console.log('⚠️ GitHub Gist 配置不完整，跳过加载')
    return null
  }
  
  console.log('🔄 开始从 GitHub Gist 加载...')
  return await getGist(config.githubToken, config.gistId)
}

// ==================== Sync Config 管理 ====================
export async function saveSyncConfig(config: SyncConfig): Promise<void> {
  const chromeApi = getChromeApi()
  if (chromeApi?.storage?.local) {
    return new Promise((resolve) => {
      console.log('saveSyncConfig - 正在保存配置:', config.syncMethod)
      chromeApi.storage.local.set({ [SYNC_CONFIG_KEY]: config }, () => {
        console.log('saveSyncConfig - 配置保存完成')
        resolve()
      })
    })
  } else {
    console.log('saveSyncConfig - 保存到 localStorage:', config.syncMethod)
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config))
  }
}

export async function loadSyncConfig(): Promise<SyncConfig> {
  const defaultConfig: SyncConfig = {
    syncMethod: 'local',
    autoSync: true
  }
  
  const chromeApi = getChromeApi()
  if (chromeApi?.storage?.local) {
    return new Promise((resolve) => {
      chromeApi.storage.local.get(SYNC_CONFIG_KEY, (result) => {
        const loadedConfig = result[SYNC_CONFIG_KEY] as SyncConfig | undefined
        console.log('loadSyncConfig - 从 chrome.storage.local 读取:', loadedConfig ? loadedConfig.syncMethod : 'undefined')
        resolve(loadedConfig || defaultConfig)
      })
    })
  } else {
    const stored = localStorage.getItem(SYNC_CONFIG_KEY)
    const loadedConfig = stored ? JSON.parse(stored) : defaultConfig
    console.log('loadSyncConfig - 从 localStorage 读取:', loadedConfig.syncMethod)
    return loadedConfig
  }
}

// ==================== 新增：统一的数据加载和保存（支持同步配置）====================
let cachedSyncConfig: SyncConfig | null = null

/**
 * 获取当前的同步配置（带缓存）
 */
export async function getSyncConfig(): Promise<SyncConfig> {
  if (cachedSyncConfig) {
    console.log('使用缓存的同步配置:', cachedSyncConfig.syncMethod)
    return cachedSyncConfig
  }
  console.log('从存储中加载同步配置...')
  cachedSyncConfig = await loadSyncConfig()
  console.log('加载到的同步配置:', cachedSyncConfig.syncMethod)
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
  
  console.log('loadDataWithSync - 当前同步方式:', config.syncMethod)
  
  // 根据同步方式加载数据
  if (config.syncMethod === 'chrome-sync' && isChromeExtension) {
    console.log('尝试从 Chrome Storage Sync 加载数据...')
    const data = await loadFromChromeSync()
    if (data) {
      console.log('✅ 从 Chrome Storage Sync 加载数据成功')
      return data
    }
    console.log('⚠️ Chrome Storage Sync 中没有数据，回退到本地存储')
  } else if (config.syncMethod === 'github-gist') {
    console.log('尝试从 GitHub Gist 加载数据...')
    const data = await loadFromGitHubGist(config)
    if (data) {
      console.log('✅ 从 GitHub Gist 加载数据成功')
      return data
    }
    console.log('⚠️ GitHub Gist 中没有数据，回退到本地存储')
  }
  
  // 回退到本地存储
  console.log('📁 从本地存储加载数据')
  return await loadData()
}

/**
 * 统一的保存数据方法（根据同步配置保存到远程）
 */
const SYNC_DEBOUNCE_MS = 800
let syncPendingState: AppState | null = null
let syncPendingForceRemote = false
let syncTimer: number | null = null
let syncPendingResolvers: Array<() => void> = []

type SaveDataWithSyncOptions = {
  forceRemote?: boolean
}

export function saveDataWithSync(state: AppState, options: SaveDataWithSyncOptions = {}): Promise<void> {
  syncPendingState = state
  syncPendingForceRemote = syncPendingForceRemote || !!options.forceRemote

  return new Promise((resolve) => {
    syncPendingResolvers.push(resolve)

    if (syncTimer) {
      clearTimeout(syncTimer)
    }

    syncTimer = (typeof globalThis.setTimeout === 'function' ? globalThis.setTimeout : setTimeout)(async () => {
      const toSave = syncPendingState!
      const forceRemote = syncPendingForceRemote
      syncPendingState = null
      syncPendingForceRemote = false
      syncTimer = null
      const resolvers = syncPendingResolvers.slice()
      syncPendingResolvers = []

      try {
        const config = await getSyncConfig()
        console.log('🔄 开始同步数据，同步方式:', config.syncMethod)

        const shouldSyncRemote = forceRemote || !!config.autoSync
        let remoteSynced = false

        if (shouldSyncRemote && config.syncMethod === 'chrome-sync' && isChromeExtension) {
          await saveToChromeSync(toSave)
          remoteSynced = true
        } else if (shouldSyncRemote && config.syncMethod === 'github-gist') {
          await saveToGitHubGist(config, toSave)
          remoteSynced = true
        } else if (!shouldSyncRemote && config.syncMethod !== 'local') {
          console.log('ℹ️ 自动同步已关闭，仅保存到本地')
        } else {
          console.log('ℹ️ 使用本地存储，跳过远程同步')
        }

        await performWrite(toSave)

        if (remoteSynced) {
          config.lastSyncTime = Date.now()
          await saveSyncConfig(config)
          console.log('✅ 数据同步完成，最后同步时间:', new Date(config.lastSyncTime).toLocaleString())
        }
      } catch (error) {
        console.error('❌ 同步失败:', error)
        console.log('⚠️ 回退到本地存储保存')
        await performWrite(toSave)
      }

      resolvers.forEach(r => r())
    }, SYNC_DEBOUNCE_MS) as unknown as number
  })
}
