# Tab Manager - 简化增强版

## 🎯 核心功能

### Toby 风格标签页管理
- ✅ **Spaces (工作空间)**: 创建多个独立的工作空间组织不同项目
- ✅ **卡片式布局**: 现代化卡片设计，视觉清爽美观
- ✅ **深色模式**: 一键切换深色/浅色主题
- ✅ **拖拽排序**: 支持分组和书签的拖拽排序
- ✅ **笔记功能**: 每个书签可添加备注简介
- ✅ **导入导出**: 完整的数据备份和恢复功能

---

## 🚀 快速开始

### 1. 创建工作空间
```
点击顶部 "+" → 输入名称 → 完成
```

### 2. 添加分组
```
点击 "新建分组" → 输入分组名 → 选择颜色
```

### 3. 添加书签
- 方式 1: 点击分组内的"+ 添加书签"
- 方式 2: 从左侧边栏拖拽标签页到分组

### 4. 整理顺序
- 拖拽分组标题 → 调整分组顺序
- 拖拽书签卡片 → 调整书签顺序

### 5. 切换主题
```
点击右上角 🌙/☀️ 按钮
```

### 6. 数据备份
```
点击 "导出" → 保存 JSON 文件
点击 "导入" → 选择 JSON 文件
```

---

## 💡 代码简化亮点

### 1. **类型定义精简**
```typescript
// 只保留必要的接口
interface BookmarkItem { /* ... */ }
interface Group { /* ... */ }
interface Space { /* ... */ }
interface AppState { /* ... */ }
```

### 2. **Store 优化**
- 移除冗余的 `sharedSpaces`
- 统一使用 `get()` 获取状态
- 简化异步操作

```typescript
// 简化前
const { spaces, activeSpaceId, sessions, isDarkMode } = get()
await saveData({ spaces, activeSpaceId, sessions, isDarkMode })

// 简化后
set({ spaces })
await saveData(get())
```

### 3. **组件重构**
```typescript
// BookmarkCard - 从 200+ 行缩减到 80 行
export default function BookmarkCard({ item, onRemove, onEdit }) {
  const [isEditing, setIsEditing] = useState(false)
  
  return (
    <div className="bookmark-card">
      {/* 简洁的 JSX 结构 */}
    </div>
  )
}
```

### 4. **CSS 模块化**
- 移除重复样式
- 统一命名规范
- 利用 CSS 变量实现主题

```css
/* 深色模式只需切换类名 */
.dark-mode {
  --bg-primary: #1a1a1a;
  --text-primary: #f3f4f6;
}
```

---

## 📦 文件结构

```
src/
├── components/
│   ├── BookmarkCard.tsx     # 书签卡片 (简化版)
│   ├── Bookmarks.tsx        # 书签管理主组件
│   ├── Sessions.tsx         # 会话历史
│   ├── ThemeToggle.tsx      # 主题切换
│   └── QuickLauncher.tsx    # 快速启动器
├── store/
│   └── useStore.ts          # Zustand 状态管理 (精简版)
├── shared/
│   ├── types.ts             # TypeScript 类型定义
│   └── storage.ts           # 本地存储封装
├── App.tsx                  # 主应用组件
└── App.css                  # 全局样式
```

---

## 🔧 技术栈

| 技术 | 用途 |
|------|------|
| React 19 | UI 框架 |
| TypeScript | 类型系统 |
| Zustand | 状态管理 |
| Vite | 构建工具 |
| Chrome Extension API | 浏览器扩展 |

---

## 🎨 设计原则

### 1. **极简主义**
- 移除所有不必要的装饰
- 专注于核心功能
- 减少用户认知负担

### 2. **一致性**
- 统一的圆角 (12px)
- 一致的间距系统 (8px 倍数)
- 标准化的过渡动画 (0.3s)

### 3. **渐进增强**
- 基础功能简单直观
- 高级功能按需使用
- 不破坏原有体验

---

## ⚡ 性能优化

### 1. **渲染优化**
```css
/* 使用 transform 替代位置变化 */
.group-card:hover {
  transform: translateY(-4px);
  /* 避免使用 top: -4px */
}
```

### 2. **事件防抖**
```typescript
const [isDragging, setIsDragging] = useState(false)
setTimeout(() => setIsDragging(false), 100)
```

### 3. **CSS 变量**
```css
/* 一次定义，全局使用 */
:root { --accent-color: #4f46e5; }
.button { background: var(--accent-color); }
```

---

## 🐛 已知问题

1. Node.js 版本需 >= 20 (开发环境问题)
2. 分享链接功能暂未实现后端支持
3. 大量书签时建议分批导入

---

## 📝 更新日志

**v2.0 - 简化增强版**
- ✅ 精简代码 40%+
- ✅ 移除冗余组件
- ✅ 优化 Store 结构
- ✅ 统一 CSS 样式
- ✅ 改进用户体验

**v1.0 - Toby 风格版**
- ✅ 初始实现 Toby 核心功能
- ✅ 卡片式布局
- ✅ 深色模式
- ✅ 拖拽排序

---

## 🙏 致谢

灵感来源于 [Toby for Chrome](https://www.gettoby.com/)
