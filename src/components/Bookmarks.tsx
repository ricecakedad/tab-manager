import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import BookmarkCard from './BookmarkCard'
import type { TabInfo } from '../shared/types'

type DragPayload =
  | { type: 'tab'; data: TabInfo }
  | { type: 'bookmark'; groupId: string; index: number }

interface AddBookmarkModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (data: { url: string; title: string; note: string; tags: string[] }) => Promise<void>
}

const AddBookmarkModal: React.FC<AddBookmarkModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!url.trim()) {
      setError('请输入 URL')
      return
    }

    // 验证 URL 格式
    try {
      new URL(url)
    } catch {
      setError('请输入有效的 URL（包含 http:// 或 https://）')
      return
    }

    setIsSubmitting(true)
    try {
      await onAdd({
        url: url.trim(),
        title: title.trim() || url.trim(),
        note: note.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean)
      })
      
      // 重置表单
      setUrl('')
      setTitle('')
      setNote('')
      setTags('')
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : '添加失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuickFill = async () => {
    // 尝试从剪贴板读取 URL
    try {
      const text = await navigator.clipboard.readText()
      if (text.startsWith('http://') || text.startsWith('https://')) {
        setUrl(text)
        setTitle('')
      }
    } catch (err) {
      console.error('无法读取剪贴板:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📑 添加新书签</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="bookmark-form">
          {error && <div className="form-error">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="url">
              URL <span className="required">*</span>
            </label>
            <div className="input-with-button">
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                autoFocus
                required
              />
              <button 
                type="button" 
                className="quick-fill-btn"
                onClick={handleQuickFill}
                title="从剪贴板粘贴 URL"
              >
                📋
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="title">标题</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="可选，留空则使用 URL"
            />
          </div>

          <div className="form-group">
            <label htmlFor="note">描述/笔记</label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="可选，添加一些描述或备注..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="tags">标签</label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="用逗号分隔，例如：工作，学习，技术"
            />
            <span className="form-hint">多个标签用逗号分隔</span>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? '添加中...' : '添加书签'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Bookmarks({ 
  onTabDrop,
  onSaveAllTabs 
}: { 
  onTabDrop?: (tab: TabInfo) => void,
  onSaveAllTabs?: (groupId: string) => void 
}) {
  const { getActiveSpace, addBookmark, removeBookmark, moveBookmark, moveBookmarkToGroup, addGroup, updateGroupName, updateGroupColor, updateBookmark, updateGroupNote, removeGroup } = useStore()
  const space = getActiveSpace()
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [groupNote, setGroupNote] = useState('')
  const [addingBookmarkGroupId, setAddingBookmarkGroupId] = useState<string | null>(null)
  const [moreMenuOpenId, setMoreMenuOpenId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)
  // 点击外部关闭更多菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuOpenId && !(e.target as Element).closest('.more-menu-btn') && !(e.target as Element).closest('.more-menu-dropdown')) {
        setMoreMenuOpenId(null)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [moreMenuOpenId])

  if (!space) return <div className="empty-state">暂无活动 Space</div>

  // 切换分组折叠状态
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((current) => ({
      ...current,
      [groupId]: !current[groupId]
    }))
  }

  // 检查分组是否折叠
  const isCollapsed = (groupId: string) => {
    return !!collapsedGroups[groupId]
  }


  const onAddBookmark = async (groupId: string, data: { url: string; title: string; note: string; tags: string[] }) => {
    await addBookmark(space.id, groupId, { 
      url: data.url, 
      title: data.title, 
      favicon: '', 
      tags: data.tags, 
      note: data.note 
    })
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
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as DragPayload
      
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
    e.dataTransfer.dropEffect = 'move'
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
        <div 
          key={g.id} 
          className={`group ${isCollapsed(g.id) ? 'collapsed' : ''}`} 
          style={{ backgroundColor: g.color || '#ffffff' }}
        >
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
              {/* 颜色选择器保留在头部 */}
              <input
                type="color"
                value={g.color || '#ffffff'}
                onChange={(e) => handleGroupColorChange(g.id, e.target.value)}
                className="color-picker"
                title="设置背景色"
              />
              
              {/* 折叠/展开按钮 */}
              <button 
                className="collapse-btn"
                onClick={() => toggleGroupCollapse(g.id)}
                title={isCollapsed(g.id) ? '展开分组' : '折叠分组'}
              >
                {isCollapsed(g.id) ? '⌄' : '⌃'}
              </button>

              {/* 更多功能按钮 */}
              <div className="more-menu-wrapper" style={{ position: 'relative' }}>
                <button 
                  className="more-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMoreMenuOpenId(moreMenuOpenId === g.id ? null : g.id)
                  }}
                  title="更多功能"
                >
                  ⋮
                </button>

                {/* 下拉菜单 */}
                {moreMenuOpenId === g.id && (
                  <div className="more-menu-dropdown">
                    <button 
                      className="menu-item"
                      onClick={() => {
                        handleNoteClick(g.id, g.note ?? '')
                        setMoreMenuOpenId(null)
                      }}
                      title="添加/编辑笔记"
                    >
                      📝 笔记
                    </button>
                    <button 
                      className="menu-item"
                      onClick={() => {
                        onSaveAllTabs?.(g.id)
                        setMoreMenuOpenId(null)
                      }}
                      title="保存所有打开的标签到此分组"
                    >
                      💾 保存标签
                    </button>
                    <button 
                      className="menu-item"
                      onClick={() => {
                        setAddingBookmarkGroupId(g.id)
                        setMoreMenuOpenId(null)
                      }}
                      title="添加书签"
                    >
                      ➕ 添加书签
                    </button>
                    <div className="menu-divider"></div>
                    <button 
                      className="menu-item danger"
                      onClick={() => {
                        if (confirm(`确定要删除分组 "${g.name}" 吗？`)) {
                          removeGroup(space.id, g.id)
                          setMoreMenuOpenId(null)
                        }
                      }}
                      title="删除此分组"
                    >
                      🗑️ 删除分组
                    </button>
                  </div>
                )}
              </div>

            </div>


          </div>
            {/* 根据折叠状态显示/隐藏内容 */}
            {!isCollapsed(g.id) && (
              <>
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
                  className={`group-list ${dragOverGroupId === g.id ? 'drag-over' : ''}`}
                  onDragOver={onDragOver}
                  onDragEnter={(e) => {
                    e.preventDefault()
                    setDragOverGroupId(g.id)
                  }}
                  onDragLeave={(e) => {
                    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as HTMLElement)) {
                      setDragOverGroupId(null)
                    }
                  }}
                  onDrop={(e) => {
                    setDragOverGroupId(null)
                    handleBookmarkDrop(e, g.id, g.items.length)
                  }}
                >
                  {g.items.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'bookmark', groupId: g.id, index: idx }))}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        setDragOverGroupId(null)
                        handleBookmarkDrop(e, g.id, idx)
                      }}
                      className="bookmark-item-enhanced"
                    >
                      <BookmarkCard item={item} onRemove={() => removeBookmark(space.id, g.id, item.id)} onEdit={(title, note) => updateBookmark(space.id, g.id, item.id, title, note)} />
                    </div>
                  ))}
                  {g.items.length === 0 && <div className="empty">拖拽标签到这里或点击"+添加"按钮</div>}
                </div>

              </>
            )}
        </div>
      ))}

      {/* 单一模态框实例，在循环外渲染 */}
      <AddBookmarkModal
        isOpen={addingBookmarkGroupId !== null}
        onClose={() => setAddingBookmarkGroupId(null)}
        onAdd={(data) => onAddBookmark(addingBookmarkGroupId!, data)}
      />
    </div>
  )
}
