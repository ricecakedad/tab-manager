import { useRef, useState } from 'react'
import { exportData, importData } from '../shared/storage'
import { useStore } from '../store/useStore'

export default function ImportExport() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const initialize = useStore(state => state.initialize)
  const [isImporting, setIsImporting] = useState(false)

  const handleExport = async () => {
    try {
      const json = await exportData()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tab-manager-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请重试')
    }
  }

  const handleImportFile = async (file: File | null) => {
    if (!file) return
    
    if (!confirm('导入数据将覆盖当前所有数据，确定要继续吗？')) {
      return
    }
    
    setIsImporting(true)
    try {
      const text = await file.text()
      await importData(text)
      await initialize()
      alert('✅ 导入成功！')
    } catch (error) {
      console.error('导入失败:', error)
      alert('❌ 导入失败：文件格式错误或已损坏')
    } finally {
      setIsImporting(false)
      // 重置 input 以便下次选择同一文件
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <div className="import-export-section">
      <div className="section-header">
        <h3>💾 数据管理</h3>
        <p className="section-desc">备份和恢复您的标签页数据</p>
      </div>
      
      <div className="action-buttons">
        <button 
          className="action-btn export-btn" 
          onClick={handleExport}
          disabled={isImporting}
        >
          📤 导出数据
        </button>
        
        <label className="action-btn import-btn">
          📥 导入数据
          <input 
            ref={inputRef}
            type="file" 
            accept="application/json"
            onChange={e => handleImportFile(e.target.files?.[0] || null)}
            disabled={isImporting}
            style={{ display: 'none' }}
          />
        </label>
        
        {isImporting && (
          <span className="importing-hint">正在导入...</span>
        )}
      </div>
    </div>
  )
}
