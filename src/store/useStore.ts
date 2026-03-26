import { create } from 'zustand'
import type { Space, TabSession, BookmarkItem } from '../shared/types'
import { loadDataWithSync, saveDataWithSync } from '../shared/storage'

interface StoreState {
  spaces: Space[]
  activeSpaceId: string
  sessions: TabSession[]
  isDarkMode: boolean
  isLoading: boolean
  searchQuery: string

  // Actions
  initialize: () => Promise<void>
  setActiveSpace: (spaceId: string) => Promise<void>
  addSpace: (name: string, icon: string, color: string) => Promise<void>
  addGroup: (spaceId: string, groupName: string) => Promise<void>
  updateGroupName: (spaceId: string, groupId: string, newName: string) => Promise<void>
  updateGroupColor: (spaceId: string, groupId: string, color: string) => Promise<void>
  updateGroupNote: (spaceId: string, groupId: string, note: string) => Promise<void>
  addBookmark: (spaceId: string, groupId: string, bookmark: Omit<BookmarkItem, 'id' | 'addedAt'>) => Promise<void>
  updateBookmark: (spaceId: string, groupId: string, bookmarkId: string, newTitle: string, newNote?: string) => Promise<void>
  removeBookmark: (spaceId: string, groupId: string, bookmarkId: string) => Promise<void>
  moveBookmark: (spaceId: string, groupId: string, fromIndex: number, toIndex: number) => Promise<void>
  moveBookmarkToGroup: (spaceId: string, fromGroupId: string, toGroupId: string, bookmarkIndex: number, toIndex: number) => Promise<void>
  setSearchQuery: (query: string) => void
  getActiveSpace: () => Space | undefined
  getFilteredBookmarks: () => { groupName: string; items: BookmarkItem[] }[]
}

export const useStore = create<StoreState>((set, get) => ({
  spaces: [],
  activeSpaceId: '',
  sessions: [],
  isDarkMode: false,
  isLoading: true,
  searchQuery: '',

  initialize: async () => {
    try {
      const data = await loadDataWithSync() // 使用新的同步加载方法
      set({
        spaces: data.spaces,
        activeSpaceId: data.activeSpaceId,
        sessions: data.sessions,
        isDarkMode: data.isDarkMode,
        isLoading: false
      })
      
      // 监听云端数据加载事件
      const handleDataLoaded = (event: CustomEvent) => {
        const data = event.detail
        if (data) {
          set({
            spaces: data.spaces,
            activeSpaceId: data.activeSpaceId,
            sessions: data.sessions,
            isDarkMode: data.isDarkMode
          })
        }
      }
      
      window.addEventListener('sync-data-loaded', handleDataLoaded as EventListener)
    } catch (error) {
      console.error('初始化失败:', error)
      set({ isLoading: false })
    }
  },

  setActiveSpace: async (spaceId: string) => {
    set({ activeSpaceId: spaceId })
    const { spaces, sessions, isDarkMode } = get()
    await saveDataWithSync({ spaces, activeSpaceId: spaceId, sessions, isDarkMode }) // 使用同步保存
  },

  addSpace: async (name: string, icon: string, color: string) => {
    const { spaces, activeSpaceId, sessions, isDarkMode } = get()
    const newSpace: Space = {
      id: `space-${Date.now()}`,
      name,
      icon,
      color,
      groups: [],
      createdAt: Date.now()
    }
    const newSpaces = [...spaces, newSpace]
    set({ spaces: newSpaces })
    await saveDataWithSync({ spaces: newSpaces, activeSpaceId, sessions, isDarkMode }) // 使用同步保存
  },

  addGroup: async (spaceId: string, groupName: string) => {
    const { spaces, activeSpaceId, sessions, isDarkMode } = get()
    const newSpaces = spaces.map(space => {
      if (space.id === spaceId) {
        return {
          ...space,
          groups: [...space.groups, {
            id: `group-${Date.now()}`,
            name: groupName,
            color: '#ffffff',
            items: [],
            collapsed: false
          }]
        }
      }
      return space
    })
    set({ spaces: newSpaces })
    // debounce save to avoid frequent storage writes
    saveDataWithSync({ spaces: newSpaces, activeSpaceId, sessions, isDarkMode }) // 使用同步保存
  },

  updateGroupName: async (spaceId: string, groupId: string, newName: string) => {
    const { spaces, activeSpaceId, sessions, isDarkMode } = get()
    const newSpaces = spaces.map(space => {
      if (space.id === spaceId) {
        return {
          ...space,
          groups: space.groups.map(group => {
            if (group.id === groupId) {
              return { ...group, name: newName }
            }
            return group
          })
        }
      }
      return space
    })
    set({ spaces: newSpaces })
    saveDataWithSync({ spaces: newSpaces, activeSpaceId, sessions, isDarkMode }) // 使用同步保存
  },

  updateGroupColor: async (spaceId: string, groupId: string, color: string) => {
    const { spaces, activeSpaceId, sessions, isDarkMode } = get()
    const newSpaces = spaces.map(space => {
      if (space.id === spaceId) {
        return {
          ...space,
          groups: space.groups.map(group => {
            if (group.id === groupId) {
              return { ...group, color }
            }
            return group
          })
        }
      }
      return space
    })
    set({ spaces: newSpaces })
    saveDataWithSync({ spaces: newSpaces, activeSpaceId, sessions, isDarkMode }) // 使用同步保存
  },

  updateGroupNote: async (spaceId: string, groupId: string, note: string) => {
    const { spaces, activeSpaceId, sessions, isDarkMode } = get()
    const newSpaces = spaces.map(space => {
      if (space.id === spaceId) {
        return {
          ...space,
          groups: space.groups.map(group => {
            if (group.id === groupId) {
              return { ...group, note }
            }
            return group
          })
        }
      }
      return space
    })
    set({ spaces: newSpaces })
    saveDataWithSync({ spaces: newSpaces, activeSpaceId, sessions, isDarkMode }) // 使用同步保存
  },

  addBookmark: async (spaceId: string, groupId: string, bookmark: Omit<BookmarkItem, 'id' | 'addedAt'>) => {
    const { spaces, activeSpaceId, sessions, isDarkMode } = get()
    const newSpaces = spaces.map(space => {
      if (space.id === spaceId) {
        return {
          ...space,
          groups: space.groups.map(group => {
            if (group.id === groupId) {
              return {
                ...group,
                items: [...group.items, {
                  ...bookmark,
                  id: `bm-${Date.now()}`,
                  addedAt: Date.now()
                }]
              }
            }
            return group
          })
        }
      }
      return space
    })
    set({ spaces: newSpaces })
    saveDataWithSync({ spaces: newSpaces, activeSpaceId, sessions, isDarkMode }) // 使用同步保存
  },

  removeBookmark: async (spaceId: string, groupId: string, bookmarkId: string) => {
    const { spaces, activeSpaceId, sessions, isDarkMode } = get()
    const newSpaces = spaces.map(space => {
      if (space.id === spaceId) {
        return {
          ...space,
          groups: space.groups.map(group => {
            if (group.id === groupId) {
              return {
                ...group,
                items: group.items.filter(item => item.id !== bookmarkId)
              }
            }
            return group
          })
        }
      }
      return space
    })
    set({ spaces: newSpaces })
    saveDataWithSync({ spaces: newSpaces, activeSpaceId, sessions, isDarkMode }) // 使用同步保存
  },

  updateBookmark: async (spaceId: string, groupId: string, bookmarkId: string, newTitle: string, newNote?: string) => {
    const { spaces, activeSpaceId, sessions, isDarkMode } = get()
    const newSpaces = spaces.map(space => {
      if (space.id === spaceId) {
        return {
          ...space,
          groups: space.groups.map(group => {
            if (group.id === groupId) {
              return {
                ...group,
                items: group.items.map(item => {
                  if (item.id === bookmarkId) {
                    return { ...item, title: newTitle, note: newNote !== undefined ? newNote : item.note }
                  }
                  return item
                })
              }
            }
            return group
          })
        }
      }
      return space
    })
    set({ spaces: newSpaces })
    saveDataWithSync({ spaces: newSpaces, activeSpaceId, sessions, isDarkMode }) // 使用同步保存
  },

  moveBookmark: async (spaceId: string, groupId: string, fromIndex: number, toIndex: number) => {
    const { spaces, activeSpaceId, sessions, isDarkMode } = get()
    const newSpaces = spaces.map(space => {
      if (space.id === spaceId) {
        return {
          ...space,
          groups: space.groups.map(group => {
            if (group.id === groupId) {
              const items = [...group.items]
              const [removed] = items.splice(fromIndex, 1)
              items.splice(toIndex, 0, removed)
              return { ...group, items }
            }
            return group
          })
        }
      }
      return space
    })
    set({ spaces: newSpaces })
    saveDataWithSync({ spaces: newSpaces, activeSpaceId, sessions, isDarkMode }) // 使用同步保存
  },

  moveBookmarkToGroup: async (spaceId: string, fromGroupId: string, toGroupId: string, bookmarkIndex: number, toIndex: number) => {
    const { spaces, activeSpaceId, sessions, isDarkMode } = get()
    let bookmarkItem: BookmarkItem | null = null
    
    // 先从源分组获取书签项
    const sourceSpace = spaces.find(s => s.id === spaceId)
    const sourceGroup = sourceSpace?.groups.find(g => g.id === fromGroupId)
    if (sourceGroup && sourceGroup.items[bookmarkIndex]) {
      bookmarkItem = sourceGroup.items[bookmarkIndex]
    }
    
    if (!bookmarkItem) return
    
    // 从源分组移除并添加到目标分组
    const newSpaces = spaces.map(space => {
      if (space.id === spaceId) {
        return {
          ...space,
          groups: space.groups.map(group => {
            if (group.id === fromGroupId) {
              // 源分组：移除书签
              const items = group.items.filter((_, idx) => idx !== bookmarkIndex)
              return { ...group, items }
            } else if (group.id === toGroupId) {
              // 目标分组：插入书签
              const items = [...group.items]
              items.splice(toIndex, 0, bookmarkItem)
              return { ...group, items }
            }
            return group
          })
        }
      }
      return space
    })
    set({ spaces: newSpaces })
    saveDataWithSync({ spaces: newSpaces, activeSpaceId, sessions, isDarkMode }) // 使用同步保存
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  getActiveSpace: () => {
    const { spaces, activeSpaceId } = get()
    return spaces.find(s => s.id === activeSpaceId)
  },

  getFilteredBookmarks: () => {
    const { searchQuery } = get()
    const space = get().getActiveSpace()
    if (!space) return []

    if (!searchQuery.trim()) {
      return space.groups
        .filter(g => g.items.length > 0)
        .map(g => ({ groupName: g.name, items: g.items }))
    }

    const query = searchQuery.toLowerCase()
    return space.groups
      .map(g => ({
        groupName: g.name,
        items: g.items.filter(item =>
          item.title.toLowerCase().includes(query) ||
          item.url.toLowerCase().includes(query) ||
          item.tags.some(tag => tag.toLowerCase().includes(query))
        )
      }))
      .filter(g => g.items.length > 0)
  }
}))
