// 数据模型定义

export interface BookmarkItem {
  id: string
  url: string
  title: string
  favicon: string
  note?: string
  tags: string[]
  addedAt: number
}

export interface Group {
  id: string
  name: string
  color?: string
  note?: string
  items: BookmarkItem[]
  collapsed: boolean
}

export interface Space {
  id: string
  name: string
  icon: string
  color: string
  groups: Group[]
  createdAt: number
}

export interface TabSession {
  id: string
  name: string
  tabs: { url: string; title: string; favicon: string }[]
  savedAt: number
}

export interface AppState {
  spaces: Space[]
  activeSpaceId: string
  sessions: TabSession[]
  isDarkMode: boolean
}

export interface TabInfo {
  id: number
  title: string
  url: string
  favicon: string
  active: boolean
}
