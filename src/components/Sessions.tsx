import { useStore } from '../store/useStore'

export default function Sessions() {
  const { sessions } = useStore()
  if (sessions.length === 0) return null
  
  return (
    <div className="sessions-container">
      <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>会话历史 ({sessions.length})</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
        {sessions.slice(-5).reverse().map(session => (
          <li key={session.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: 13 }}>
            <div style={{ fontWeight: 500 }}>{session.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              {new Date(session.savedAt).toLocaleString()} · {session.tabs.length}个标签
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
