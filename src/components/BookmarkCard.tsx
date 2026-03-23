import type { BookmarkItem } from '../shared/types'
import { useState } from 'react'

export default function BookmarkCard({ item, onRemove, onEdit }: { 
  item: BookmarkItem, 
  onRemove?: () => void,
  onEdit?: (newTitle: string, newNote: string) => void 
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const [editNote, setEditNote] = useState(item.note || '')

  const handleSave = () => {
    setIsEditing(false)
    if (onEdit && (editTitle !== item.title || editNote !== item.note)) {
      onEdit(editTitle, editNote)
    }
  }

  return (
    <div className="bookmark-card" onClick={() => !isEditing && item.url && window.open(item.url, '_blank')}>
      <div className="bookmark-card-content">
        <img src={item.favicon || '/favicon.svg'} alt="" className="bookmark-favicon" />
        <div className="bookmark-info">
          {isEditing ? (
            <div className="bookmark-edit-form">
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="标题" />
              <textarea value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="简介（可选）" rows={2} />
              <div className="bookmark-edit-actions">
                <button onClick={() => { setIsEditing(false); setEditTitle(item.title); setEditNote(item.note || '') }}>取消</button>
                <button onClick={handleSave}>保存</button>
              </div>
            </div>
          ) : (
            <>
              <div className="bookmark-header">
                <h3 className="bookmark-title">{item.title}</h3>
                <div className="bookmark-actions">
                  <button onClick={(e) => { e.stopPropagation(); setIsEditing(true) }} title="编辑">✏️</button>
                  <button onClick={(e) => { e.stopPropagation(); onRemove?.() }} title="删除">🗑️</button>
                </div>
              </div>
              {item.note && <p className="bookmark-note">{item.note}</p>}
              <div className="bookmark-url-preview">{item.url}</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
