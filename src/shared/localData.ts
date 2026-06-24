import type { AppState } from './types'
import { DEFAULT_SPACES, DEFAULT_ACTIVE_SPACE_ID } from './defaultData'
import { getChromeApi } from './chrome'

export const STORAGE_KEY = 'tab-manager-data'

export async function loadData(): Promise<AppState> {
  const chromeApi = getChromeApi()
  if (chromeApi?.storage?.local) {
    return new Promise((resolve) => {
      chromeApi.storage.local.get(STORAGE_KEY, (result) => {
        const storedState = result[STORAGE_KEY] as AppState | undefined
        if (storedState) {
          resolve(storedState)
        } else {
          const defaultState = createDefaultState()
          chromeApi.storage.local.set({ [STORAGE_KEY]: defaultState })
          resolve(defaultState)
        }
      })
    })
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    return JSON.parse(stored) as AppState
  }

  const defaultState = createDefaultState()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState))
  return defaultState
}

export async function saveData(state: AppState): Promise<void> {
  return debouncedSave(state)
}

export async function saveDataImmediate(state: AppState): Promise<void> {
  return performWrite(state)
}

export function performWrite(state: AppState): Promise<void> {
  const chromeApi = getChromeApi()
  if (chromeApi?.storage?.local) {
    return new Promise((resolve) => {
      chromeApi.storage.local.set({ [STORAGE_KEY]: state }, () => {
        resolve()
      })
    })
  }

  return new Promise((resolve) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    resolve()
  })
}

function createDefaultState(): AppState {
  return {
    spaces: DEFAULT_SPACES,
    activeSpaceId: DEFAULT_ACTIVE_SPACE_ID,
    sessions: [],
    isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
  }
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
      } finally {
        const resolvers = pendingResolvers.slice()
        pendingResolvers = []
        resolvers.forEach(r => r())
      }
    }, DEBOUNCE_MS)
  })
}
