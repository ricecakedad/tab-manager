// 主题配置
export const theme = {
  colors: {
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    secondary: '#6366f1',
    danger: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b'
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px'
  },
  
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '10px',
    xl: '12px',
    '2xl': '16px',
    full: '9999px'
  },
  
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)'
  },
  
  transitions: {
    fast: '0.2s',
    normal: '0.3s',
    slow: '0.5s'
  }
} as const

// 默认 Space 配置
export const defaultSpaceConfig = {
  icon: '🗂️',
  color: '#888888',
  groupColor: '#ffffff'
} as const

// 拖拽配置
export const dragConfig = {
  delay: 100,
  opacity: 0.5,
  scale: 0.95
} as const

// 动画配置
export const animationConfig = {
  bezier: 'cubic-bezier(0.4, 0, 0.2, 1)',
  hoverTransform: 'translateY(-4px)',
  activeTransform: 'translateY(-2px)'
} as const
