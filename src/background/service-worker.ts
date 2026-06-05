import { createId } from '../shared/id'

// Background service worker for MV3
// Listens for messages from popup/newtab to save current window tabs as a session.

const STORAGE_KEY = 'tab-manager-data'

type SessionRecord = {
  id: string
  name: string
  tabs: Array<{ url: string; title: string; favicon: string }>
  savedAt: number
}

type StoredState = {
  spaces: unknown[]
  activeSpaceId: string
  sessions: SessionRecord[]
  isDarkMode: boolean
}

type Message =
  | { action: 'save-current-session'; name?: string }
  | { action: 'restore-session'; sessionId: string }

type MessageResponse = {
  success: boolean
  reason?: string
}

function getStoredState(callback: (state: StoredState) => void) {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const state = (result[STORAGE_KEY] as StoredState | undefined) || {
      spaces: [],
      activeSpaceId: '',
      sessions: [],
      isDarkMode: false
    }

    callback(state)
  })
}

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse: (resp: MessageResponse) => void) => {
  if (message.action === 'save-current-session') {
    const name = message.name || `Session ${new Date().toLocaleString()}`

    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const tabsData = tabs
        .filter((tab): tab is chrome.tabs.Tab & { url: string } => !!tab.url)
        .map((tab) => ({
          url: tab.url,
          title: tab.title || tab.url,
          favicon: tab.favIconUrl || ''
        }))

      getStoredState((state) => {
        state.sessions = state.sessions || []
        state.sessions.push({
          id: createId('session'),
          name,
          tabs: tabsData,
          savedAt: Date.now()
        })

        chrome.storage.local.set({ [STORAGE_KEY]: state }, () => {
          sendResponse({ success: true })
        })
      })
    })

    return true
  }

  if (message.action === 'restore-session') {
    getStoredState((state) => {
      if (!state.sessions.length) {
        sendResponse({ success: false, reason: 'no-sessions' })
        return
      }

      const session = state.sessions.find((savedSession) => savedSession.id === message.sessionId)
      if (!session) {
        sendResponse({ success: false, reason: 'not-found' })
        return
      }

      for (const tab of session.tabs) {
        chrome.tabs.create({ url: tab.url })
      }

      sendResponse({ success: true })
    })

    return true
  }

  return false
})
