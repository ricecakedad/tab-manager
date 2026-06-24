import React, { useState } from 'react'

interface AddBookmarkModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (data: { url: string; title: string; note: string; tags: string[] }) => Promise<void>
}

export default function AddBookmarkModal({ isOpen, onClose, onAdd }: AddBookmarkModalProps) {
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
