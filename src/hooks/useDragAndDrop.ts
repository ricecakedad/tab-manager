import { useState, useCallback } from 'react'

export function useDragAndDrop(
  onDrop: (fromIndex: number, toIndex: number) => Promise<void>,
  onExternalDrop?: (data: any, toIndex: number) => Promise<void>
) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(true)
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(async (toIndex: number) => {
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      await onDrop(draggedIndex, toIndex)
    }
    setDraggedIndex(null)
    setIsDraggingOver(false)
  }, [draggedIndex, onDrop])

  const handleExternalDrop = useCallback(async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'tab' && onExternalDrop) {
        await onExternalDrop(data.data, toIndex)
      }
    } catch (err) {
      console.error('External drop error:', err)
    }
    setIsDraggingOver(false)
  }, [onExternalDrop])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setIsDraggingOver(false)
  }, [])

  return {
    draggedIndex,
    isDraggingOver,
    handlers: {
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      onExternalDrop: handleExternalDrop,
      onDragEnd: handleDragEnd
    }
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }

  return [storedValue, setValue] as const
}
