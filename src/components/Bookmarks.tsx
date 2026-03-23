import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import BookmarkCard from './BookmarkCard'
import type { TabInfo } from '../shared/types'

export default function Bookmarks({ onTabDrop }: { onTabDrop?: (tab: TabInfo) => void }) {
  const { getActiveSpace, addBookmark, removeBookmark, moveBookmark, addGroup, updateGroupName, updateGroupColor, deleteGroup, moveGroup, exportAllSpaces, importSpaces, updateBookmark } = useStore()
  const space = getActiveSpace()
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')

  if (!space) return <div className="empty-state">暂无活动 Space</div>

  const handleAddGroup = async () => {
    const name = prompt('分组名称')
    if (name) await addGroup(space.id, name)
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('确定删除此分组？')) await deleteGroup(space.id, groupId)
  }

  const handleAddBookmark = async (groupId: string) => {
    const url = prompt('书签 URL')
    if (!url) return
    const title = prompt('标题', url) || url
    await addBookmark(space.id, groupId, { url, title, favicon: '', tags: [], note: '' })
  }

  const handleExport = () => exportAllSpaces()

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const spaces = JSON.parse(event.target?.result as string)
        if (Array.isArray(spaces)) {
          await importSpaces(spaces)
          alert(`导入 ${spaces.length} 个 Space`)
        }
      } catch {
        alert('导入失败：文件格式错误')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // 分组拖拽处理
  const handleGroupDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'group', index }))
  }

  const handleGroupDrop = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'group') {
        await moveGroup(space.id, data.index, toIndex)
      }
    } catch {}
  }

  return (
    <div className="bookmarks-root-enhanced">
      <div className="add-group-header">
        <button className="add-group-btn-enhanced" onClick={handleAddGroup}>+ 新建分组</button>
        <div className="space-actions">
          <button className="share-space-btn" onClick={handleExport}>📤 导出</button>
          <label className="share-space-btn">
            📥 导入
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
      
      <div className="groups-grid">
        {space.groups.map((group, index) => (
          <div 
            key={group.id} 
            className="group-card"
            style={{ backgroundColor: group.color || '#ffffff' }}
            draggable
            onDragStart={(e) => handleGroupDragStart(e, index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleGroupDrop(e, index)}
          >
            <div className="group-card-header">
              {editingGroupId === group.id ? (
                <input
                  className="group-name-input-enhanced"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onBlur={async () => { await updateGroupName(space.id, group.id, newGroupName); setEditingGroupId(null) }}
                  onKeyDown={e => e.key === 'Enter' && (async () => { await updateGroupName(space.id, group.id, newGroupName); setEditingGroupId(null) })()}
                  autoFocus
                />
              ) : (
                <h3 className="group-title" onClick={() => { setEditingGroupId(group.id); setNewGroupName(group.name) }}>{group.name}</h3>
              )}
              <div className="group-card-actions">
                <input type="color" value={group.color || '#ffffff'} onChange={e => updateGroupColor(space.id, group.id, e.target.value)} className="color-picker-enhanced" />
                <button className="delete-group-btn" onClick={() => handleDeleteGroup(group.id)}>🗑️</button>
              </div>
            </div>
            
            <div className="group-card-list">
              {group.items.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'bookmark', groupId: group.id, index: idx }))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault()
                    try {
                      const data = JSON.parse(e.dataTransfer.getData('application/json'))
                      if (data.type === 'bookmark' && data.groupId === group.id) {
                        await moveBookmark(space.id, group.id, data.index, idx)
                      } else if (data.type === 'tab' && onTabDrop) {
                        onTabDrop(data.data)
                      }
                    } catch {}
                  }}
                  className="bookmark-item-enhanced"
                >
                  <BookmarkCard item={item} onRemove={() => removeBookmark(space.id, group.id, item.id)} onEdit={(title, note) => updateBookmark(space.id, group.id, item.id, title, note)} />
                </div>
              ))}
              {group.items.length === 0 && <div className="group-empty-placeholder">拖拽标签到这里或点击"+ 添加书签"</div>}
            </div>
            
            <button className="add-bookmark-btn" onClick={() => handleAddBookmark(group.id)}>+ 添加书签</button>
          </div>
        ))}
      </div>
    </div>
  )
}
