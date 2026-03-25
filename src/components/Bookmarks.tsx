import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import BookmarkCard from './BookmarkCard'
import type { TabInfo } from '../shared/types'

export default function Bookmarks({ 
  onTabDrop,
  onSaveAllTabs 
}: { 
  onTabDrop?: (tab: TabInfo) => void,
  onSaveAllTabs?: (groupId: string) => void 
}) {
  const { getActiveSpace, addBookmark, removeBookmark, moveBookmark, moveBookmarkToGroup, addGroup, updateGroupName, updateGroupColor, updateBookmark, updateGroupNote } = useStore()
  const space = getActiveSpace()
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [groupNote, setGroupNote] = useState('')

  if (!space) return <div className="empty-state">暂无活动 Space</div>

  const onAddBookmark = async (groupId: string) => {
    const url = prompt('书签 URL')
    if (!url) return
    const title = prompt('标题', url) || url
    await addBookmark(space.id, groupId, { url, title, favicon: '', tags: [], note: '' })
  }

  const onAddGroup = async () => {
    const groupName = prompt('分组名称')
    if (groupName) {
      await addGroup(space.id, groupName)
    }
  }

  const handleGroupClick = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId)
    setNewGroupName(currentName)
  }

  const handleGroupSave = async (groupId: string) => {
    if (newGroupName.trim()) {
      await updateGroupName(space.id, groupId, newGroupName.trim())
    }
    setEditingGroupId(null)
  }

  const handleGroupColorChange = async (groupId: string, color: string) => {
    await updateGroupColor(space.id, groupId, color)
  }

  const handleNoteClick = (groupId: string, currentNote: string) => {
    setEditingNoteId(groupId)
    setGroupNote(currentNote || '')
  }

  const handleNoteSave = async (groupId: string) => {
    await updateGroupNote(space.id, groupId, groupNote)
    setEditingNoteId(null)
  }

  const handleBookmarkDrop = async (e: React.DragEvent, targetGroupId: string, toIndex: number) => {
    e.preventDefault()
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      
      // 处理标签页拖拽（从左侧侧边栏拖过来）
      if (data.type === 'tab' && data.data) {
        const tab = data.data
        await addBookmark(space.id, targetGroupId, {
          url: tab.url,
          title: tab.title,
          favicon: tab.favicon || '',
          tags: [],
          note: ''
        })
        // 如果外部提供了 onTabDrop 回调，也调用它（用于额外的处理）
        if (onTabDrop) {
          onTabDrop(tab)
        }
        return
      }
      
      // 处理书签拖拽：支持同分组内和跨分组移动
      if (data.type === 'bookmark' && data.groupId !== undefined && data.index !== undefined) {
        if (data.groupId === targetGroupId) {
          // 同分组内移动
          await moveBookmark(space.id, targetGroupId, data.index, toIndex)
        } else {
          // 跨分组移动
          await moveBookmarkToGroup(space.id, data.groupId, targetGroupId, data.index, toIndex)
        }
      }
    } catch (err) {
      console.error('Drop error:', err)
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  return (
    <div className="bookmarks-root">
      <div className="add-group-wrapper">
        <button className="add-group-btn-small" onClick={onAddGroup}>
          <span className="add-group-icon-small">+</span>
          <span>新建分组</span>
        </button>
      </div>
      
      {space.groups.map((g) => (
        <div key={g.id} className="group" style={{ backgroundColor: g.color || '#ffffff' }}>
          <div className="group-header">
            {editingGroupId === g.id ? (
              <input
                className="group-name-input"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onBlur={() => handleGroupSave(g.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGroupSave(g.id)
                }}
                autoFocus
              />
            ) : (
              <strong onClick={() => handleGroupClick(g.id, g.name)} title="点击编辑">
                {g.name}
              </strong>
            )}
            <div className="group-actions">
              <input
                type="color"
                value={g.color || '#ffffff'}
                onChange={(e) => handleGroupColorChange(g.id, e.target.value)}
                className="color-picker"
                title="设置背景色"
              />
              {/* Toby 风格：笔记功能 */}
              <button 
                onClick={() => handleNoteClick(g.id, g.note ?? '')}
                title="添加/编辑笔记"
                className="note-btn"
              >
                📝
              </button>
              {/* Toby 风格：一键保存当前所有标签到分组 */}
              <button 
                onClick={() => onSaveAllTabs?.(g.id)}
                title="保存所有打开的标签到此分组"
                className="save-tabs-btn"
              >
                💾 保存标签
              </button>
              <button onClick={() => onAddBookmark(g.id)}>+ 添加</button>
            </div>
          </div>
          
          {/* Toby 风格：分组笔记显示区域 */}
          {g.note && editingNoteId !== g.id && (
            <div 
              className="group-note-preview"
              onClick={() => handleNoteClick(g.id, g.note || '')}
              title="点击编辑笔记"
            >
              📝 {g.note}
            </div>
          )}
          
          {editingNoteId === g.id && (
            <div className="group-note-editor">
              <textarea
                value={groupNote}
                onChange={(e) => setGroupNote(e.target.value)}
                placeholder="添加笔记、待办事项、注意事项..."
                rows={3}
                autoFocus
              />
              <div className="note-actions">
                <button onClick={() => handleNoteSave(g.id)}>保存</button>
                <button onClick={() => setEditingNoteId(null)}>取消</button>
              </div>
            </div>
          )}
          <div 
            className="group-list" 
            onDragOver={onDragOver}
            onDrop={(e) => handleBookmarkDrop(e, g.id, g.items.length)}
          >
            {g.items.map((item, idx) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'bookmark', groupId: g.id, index: idx }))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleBookmarkDrop(e, g.id, idx)}
                className="bookmark-item-enhanced"
              >
                <BookmarkCard item={item} onRemove={() => removeBookmark(space.id, g.id, item.id)} onEdit={(title, note) => updateBookmark(space.id, g.id, item.id, title, note)} />
              </div>
            ))}
            {g.items.length === 0 && <div className="empty">拖拽标签到这里或点击"+添加"按钮</div>}
          </div>
          
          {/* Toby 风格：一键打开所有标签 */}
          {g.items.length > 0 && (
            <div className="group-footer-actions">
              <button 
                className="open-all-btn"
                onClick={() => {
                  const confirmOpen = confirm(`确定要打开 ${g.items.length} 个标签吗？`)
                  if (confirmOpen) {
                    g.items.forEach(item => window.open(item.url, '_blank'))
                  }
                }}
                title="一键打开此分组所有标签"
              >
                🚀 全部打开 ({g.items.length})
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
