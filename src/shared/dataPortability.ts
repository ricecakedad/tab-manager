import type { AppState } from './types'
import { loadData, saveDataImmediate } from './localData'

export async function exportData(): Promise<string> {
  const state = await loadData()
  return JSON.stringify(state, null, 2)
}

export async function importData(json: string): Promise<void> {
  console.log('📥 开始导入数据...')
  const parsed = JSON.parse(json) as AppState
  console.log('  - 解析后的数据:', {
    空间数量: parsed.spaces?.length || 0,
    会话数量: parsed.sessions?.length || 0,
    当前空间ID: parsed.activeSpaceId || '未设置'
  })

  console.log('💾 正在立即保存导入的数据...')
  await saveDataImmediate(parsed)
  console.log('✅ 数据已保存到存储')
}
