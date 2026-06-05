import type { BookmarkItem } from '../shared/types'
import { useState } from 'react'

export default function BookmarkCard({ 
  item, 
  onRemove,
  onEdit 
}: { 
  item: BookmarkItem, 
  onRemove?: () => void,
  onEdit?: (newTitle: string, newNote: string) => void 
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const [editNote, setEditNote] = useState(item.note || '')

  const handleClick = () => {
    if (!isEditing && item.url) {
      window.open(item.url, '_blank')
    }
  }

  const handleSave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setIsEditing(false)
    if (onEdit && (editTitle !== item.title || editNote !== (item.note || ''))) {
      onEdit(editTitle, editNote)
    }
  }

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setIsEditing(false)
    setEditTitle(item.title)
    setEditNote(item.note || '')
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRemove) {
      onRemove()
    }
  }

  return (
    <div className="bookmark-card" onClick={handleClick} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
        <img 
          src={item.favicon || '/favicon.svg'} 
          alt="" 
          style={{ 
            width: 20, 
            height: 20, 
            objectFit: 'contain',
            flexShrink: 0,
            marginTop: 2
          }} 
        />
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                className="bookmark-title-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="标题"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <textarea
                className="bookmark-note-input"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="简介（可选）"
                rows={2}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: 12,
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button 
                  className="edit-cancel-btn" 
                  onClick={handleCancel}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    borderRadius: '4px',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  取消
                </button>
                <button 
                  className="edit-save-btn" 
                  onClick={handleSave}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: 'var(--accent-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                marginBottom: 4
              }}>
                <div className="bookmark-title-text" style={{ 
                  fontWeight: 500,
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0
                }} title={item.title}>
                  {item.title}
                </div>
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button 
                    className="action-icon-btn"
                    onClick={handleEditClick}
                    title="编辑"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      opacity: 0.6,
                      transition: 'all 0.2s'
                    }}
                  >
                    ✏️
                  </button>
                  <button 
                    className="action-icon-btn"
                    onClick={handleDeleteClick}
                    title="删除"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      opacity: 0.6,
                      transition: 'all 0.2s'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              {item.note && (
                <div style={{ 
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.4,
                  maxHeight: '2.8em'
                }}>
                  {item.note}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
