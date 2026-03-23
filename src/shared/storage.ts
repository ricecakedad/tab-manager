import type { AppState, Space } from './types'
import { DEFAULT_SPACES, DEFAULT_ACTIVE_SPACE_ID } from './defaultData'

const STORAGE_KEY = 'tab-manager-data'

// 检测是否在 Chrome 扩展环境中
const isChromeExtension = typeof (window as any).chrome !== 'undefined' && (window as any).chrome.storage

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
  if (isChromeExtension) {
    return new Promise((resolve) => {
      ;(window as any).chrome.storage.local.set({ [STORAGE_KEY]: state }, () => {
        resolve()
      })
    })
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
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
