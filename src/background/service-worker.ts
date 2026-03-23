// Background service worker for MV3
// Listens for messages from popup/newtab to save current window tabs as a session

const STORAGE_KEY: string = 'tab-manager-data';

(globalThis as any).chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: (resp: any) => void) => {
  if (message?.action === 'save-current-session') {
    const name = message.name || `Session ${new Date().toLocaleString()}`
    ;(globalThis as any).chrome.tabs.query({ currentWindow: true }, (tabs: any[]) => {
      const tabsData = tabs.map(t => ({ url: t.url || '', title: t.title || '', favicon: (t.favIconUrl as string) || '' }))
      ;(globalThis as any).chrome.storage.local.get(STORAGE_KEY, (res: any) => {
        const state = res[STORAGE_KEY] || { spaces: [], activeSpaceId: '', sessions: [], isDarkMode: false }
        state.sessions = state.sessions || []
        state.sessions.push({ id: `session-${Date.now()}`, name, tabs: tabsData, savedAt: Date.now() })
        ;(globalThis as any).chrome.storage.local.set({ [STORAGE_KEY]: state }, () => {
          sendResponse({ success: true })
        })
      })
    })
    // Return true to indicate we'll send response asynchronously
    return true
  }
  if (message?.action === 'restore-session') {
    const sessionId = message.sessionId
    ;(globalThis as any).chrome.storage.local.get(STORAGE_KEY, (res: any) => {
      const state = res[STORAGE_KEY]
      if (!state || !state.sessions) {
        sendResponse({ success: false, reason: 'no-sessions' })
        return
      }
      const session = state.sessions.find((s: any) => s.id === sessionId)
      if (!session) {
        sendResponse({ success: false, reason: 'not-found' })
        return
      }
      // Open each tab in a new tab
      for (const t of session.tabs) {
        ;(globalThis as any).chrome.tabs.create({ url: t.url })
      }
      sendResponse({ success: true })
    })
    return true
  }
})
