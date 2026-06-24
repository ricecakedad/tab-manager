import { createId } from './id'
import { loadDataWithSync, saveDataWithSync } from './storage'

export async function saveCurrentSession(
  name: string,
  tabs: { url: string; title: string; favicon: string }[]
): Promise<void> {
  const state = await loadDataWithSync()
  state.sessions.push({
    id: createId('session'),
    name,
    tabs,
    savedAt: Date.now()
  })
  await saveDataWithSync(state)
}

export async function removeSession(sessionId: string): Promise<void> {
  const state = await loadDataWithSync()
  state.sessions = state.sessions.filter(s => s.id !== sessionId)
  await saveDataWithSync(state)
}
