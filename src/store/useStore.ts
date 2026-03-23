import { create } from 'zustand'
import type { Space, TabSession, BookmarkItem } from '../shared/types'
import { loadData, saveData } from '../shared/storage'

interface StoreState {
  spaces: Space[]
  activeSpaceId: string
  sessions: TabSession[]
  isDarkMode: boolean
  isLoading: boolean
  searchQuery: string

  initialize: () => Promise<void>
  setActiveSpace: (spaceId: string) => Promise<void>
  addSpace: (name: string, icon: string, color: string) => Promise<void>
  deleteSpace: (spaceId: string) => Promise<void>
  toggleDarkMode: () => Promise<void>
  addGroup: (spaceId: string, groupName: string) => Promise<void>
  updateGroupName: (spaceId: string, groupId: string, newName: string) => Promise<void>
  updateGroupColor: (spaceId: string, groupId: string, color: string) => Promise<void>
  deleteGroup: (spaceId: string, groupId: string) => Promise<void>
  addBookmark: (spaceId: string, groupId: string, bookmark: Omit<BookmarkItem, 'id' | 'addedAt'>) => Promise<void>
  updateBookmark: (spaceId: string, groupId: string, bookmarkId: string, newTitle: string, newNote?: string) => Promise<void>
  removeBookmark: (spaceId: string, groupId: string, bookmarkId: string) => Promise<void>
  moveBookmark: (spaceId: string, groupId: string, fromIndex: number, toIndex: number) => Promise<void>
  moveGroup: (spaceId: string, fromIndex: number, toIndex: number) => Promise<void>
  setSearchQuery: (query: string) => void
  getActiveSpace: () => Space | undefined
  getFilteredBookmarks: () => { groupName: string; items: BookmarkItem[] }[]
  exportAllSpaces: () => Promise<void>
  importSpaces: (spaces: Space[]) => Promise<void>
}

export const useStore = create<StoreState>((set, get) => ({
  spaces: [],
  activeSpaceId: '',
  sessions: [],
  isDarkMode: false,
  isLoading: true,
  searchQuery: '',

  initialize: async () => {
    const data = await loadData()
    set({
      spaces: data.spaces,
      activeSpaceId: data.activeSpaceId,
      sessions: data.sessions,
      isDarkMode: data.isDarkMode,
      isLoading: false
    })
    if (data.isDarkMode) document.documentElement.classList.add('dark-mode')
  },

  setActiveSpace: async (spaceId: string) => {
    set({ activeSpaceId: spaceId })
    await saveData(get())
  },

  toggleDarkMode: async () => {
    const isDarkMode = !get().isDarkMode
    set({ isDarkMode })
    document.documentElement.classList.toggle('dark-mode')
    await saveData(get())
  },

  addSpace: async (name: string, icon: string, color: string) => {
    const spaces = [...get().spaces, {
      id: `space-${Date.now()}`,
      name, icon, color,
      groups: [],
      createdAt: Date.now()
    }]
    set({ spaces })
    await saveData(get())
  },

  deleteSpace: async (spaceId: string) => {
    const spaces = get().spaces.filter(s => s.id !== spaceId)
    const activeSpaceId = spaces[0]?.id || ''
    set({ spaces, activeSpaceId })
    await saveData(get())
  },

  addGroup: async (spaceId: string, groupName: string) => {
    const spaces = get().spaces.map(space =>
      space.id === spaceId ? {
        ...space,
        groups: [...space.groups, {
          id: `group-${Date.now()}`,
          name: groupName,
          color: '#ffffff',
          items: [],
          collapsed: false
        }]
      } : space
    )
    set({ spaces })
    await saveData(get())
  },

  updateGroupName: async (_spaceId: string, groupId: string, newName: string) => {
    const spaces = get().spaces.map(space => ({
      ...space,
      groups: space.groups.map(group =>
        group.id === groupId ? { ...group, name: newName } : group
      )
    }))
    set({ spaces })
    await saveData(get())
  },

  updateGroupColor: async (_spaceId: string, groupId: string, color: string) => {
    const spaces = get().spaces.map(space => ({
      ...space,
      groups: space.groups.map(group =>
        group.id === groupId ? { ...group, color } : group
      )
    }))
    set({ spaces })
    await saveData(get())
  },

  deleteGroup: async (_spaceId: string, groupId: string) => {
    const spaces = get().spaces.map(space => ({
      ...space,
      groups: space.groups.filter(g => g.id !== groupId)
    }))
    set({ spaces })
    await saveData(get())
  },

  addBookmark: async (_spaceId: string, groupId: string, bookmark: Omit<BookmarkItem, 'id' | 'addedAt'>) => {
    const spaces = get().spaces.map(space => ({
      ...space,
      groups: space.groups.map(group =>
        group.id === groupId ? {
          ...group,
          items: [...group.items, { ...bookmark, id: `bm-${Date.now()}`, addedAt: Date.now() }]
        } : group
      )
    }))
    set({ spaces })
    await saveData(get())
  },

  removeBookmark: async (_spaceId: string, groupId: string, bookmarkId: string) => {
    const spaces = get().spaces.map(space => ({
      ...space,
      groups: space.groups.map(group =>
        group.id === groupId ? {
          ...group,
          items: group.items.filter(item => item.id !== bookmarkId)
        } : group
      )
    }))
    set({ spaces })
    await saveData(get())
  },

  updateBookmark: async (_spaceId: string, groupId: string, bookmarkId: string, newTitle: string, newNote?: string) => {
    const spaces = get().spaces.map(space => ({
      ...space,
      groups: space.groups.map(group =>
        group.id === groupId ? {
          ...group,
          items: group.items.map(item =>
            item.id === bookmarkId ? { ...item, title: newTitle, note: newNote ?? item.note } : item
          )
        } : group
      )
    }))
    set({ spaces })
    await saveData(get())
  },

  moveBookmark: async (_spaceId: string, groupId: string, fromIndex: number, toIndex: number) => {
    const spaces = get().spaces.map(space => ({
      ...space,
      groups: space.groups.map(group =>
        group.id === groupId ? {
          ...group,
          items: ((items) => {
            const [removed] = items.splice(fromIndex, 1)
            items.splice(toIndex, 0, removed)
            return items
          })([...group.items])
        } : group
      )
    }))
    set({ spaces })
    await saveData(get())
  },

  moveGroup: async (spaceId: string, fromIndex: number, toIndex: number) => {
    const spaces = get().spaces.map(space =>
      space.id === spaceId ? {
        ...space,
        groups: ((groups) => {
          const [removed] = groups.splice(fromIndex, 1)
          groups.splice(toIndex, 0, removed)
          return groups
        })([...space.groups])
      } : space
    )
    set({ spaces })
    await saveData(get())
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  getActiveSpace: () => get().spaces.find(s => s.id === get().activeSpaceId),

  getFilteredBookmarks: () => {
    const { searchQuery } = get()
    const space = get().getActiveSpace()
    if (!space) return []

    if (!searchQuery.trim()) {
      return space.groups.filter(g => g.items.length > 0).map(g => ({ groupName: g.name, items: g.items }))
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
  },

  exportAllSpaces: async () => {
    const dataStr = JSON.stringify(get().spaces, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `toby-spaces-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  },

  importSpaces: async (spaces: Space[]) => {
    const newSpaces = spaces.map(space => ({
      ...space,
      id: `space-${Date.now()}-${Math.random()}`,
      groups: space.groups.map(g => ({
        ...g,
        id: `group-${Date.now()}-${Math.random()}`,
        items: g.items.map(i => ({
          ...i,
          id: `bm-${Date.now()}-${Math.random()}`
        }))
      }))
    }))
    set({ spaces: [...get().spaces, ...newSpaces] })
    await saveData(get())
  }
}))
