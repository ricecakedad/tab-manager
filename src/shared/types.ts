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

// 新增：同步配置相关类型
export interface SyncConfig {
  syncMethod: 'chrome-sync' | 'github-gist' | 'local' // 同步方式
  githubToken?: string // GitHub Personal Access Token
  githubUsername?: string // GitHub 用户名
  gistId?: string // 已创建的 Gist ID
  lastSyncTime?: number // 最后同步时间
  autoSync?: boolean // 是否自动同步
}

export interface AppStateWithSync extends AppState {
  syncConfig?: SyncConfig
}

export interface TabInfo {
  id: number
  title: string
  url: string
  favicon: string
  active: boolean
}
