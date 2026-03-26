# Tab Manager - 标签页管理器

一个功能强大的浏览器标签页和书签管理工具，支持多空间管理、云同步等功能。

## 功能特性

### 核心功能
- 🗂 **多空间管理**: 创建不同的空间来分类管理书签和标签
- 📑 **拖拽排序**: 支持书签和分组的拖拽操作
- 🔍 **快速搜索**: 基于 Fuse.js 的模糊搜索
- 💾 **会话管理**: 保存和恢复浏览器会话
- 📤 **导入导出**: 支持数据备份和恢复
- ☁️ **云同步**: 支持 Chrome Storage Sync 和 GitHub Gist 两种同步方式

### ☁️ 数据同步功能（新增）

为了在没有后端服务器的情况下实现跨设备数据同步，我们提供了两种方案:

#### 方案对比

| 特性 | Chrome Storage Sync | GitHub Gist |
|------|---------------------|-------------|
| **存储限制** | ~100KB | 无限制 |
| **配置难度** | ⭐ 简单 | ⭐⭐⭐ 中等 |
| **跨平台** | ✅ Chrome 浏览器 | ✅ 所有平台 |
| **版本控制** | ❌ | ✅ |
| **查看历史** | ❌ | ✅ |
| **推荐场景** | 个人日常使用 | 需要备份/恢复历史 |

### 使用方法

#### 1. Chrome Storage Sync（推荐新手）

**优点:**
- ✅ 零配置，开箱即用
- ✅ 自动同步，无需手动操作
- ✅ Chrome 官方支持，稳定可靠

**缺点:**
- ⚠️ 有存储容量限制 (~100KB)
- ⚠️ 需要登录 Chrome 并开启同步

**配置步骤:**
1. 确保已在 Chrome 浏览器中登录 Google 账号
2. 打开 Chrome 设置 > 同步和 Google 服务 > 确认已开启同步
3. 点击扩展右上角的 ☁️ 按钮
4. 选择"Chrome 云同步"
5. 点击"保存配置"
6. 完成！数据将自动同步

#### 2. GitHub Gist（推荐高级用户）

**优点:**
- ✅ 免费无限存储空间
- ✅ 可查看和恢复历史版本
- ✅ 数据完全由自己控制

**缺点:**
- ⚠️ 需要 GitHub 账号
- ⚠️ 需要手动获取 Token
- ⚠️ 首次配置稍复杂

**获取 GitHub Personal Access Token:**

1. 访问 [GitHub Token 设置页面](https://github.com/settings/tokens)
2. 点击 **"Generate new token"** 下拉箭头，选择 **"Generate new token (classic)"**
3. 输入备注名称 (如：Tab Manager)
4. 设置过期时间 (建议选 "No expiration")
5. **勾选权限**: 
   - ✅ `gist` - 创建和管理 Gist
6. 点击 **"Generate token"**
7. **复制生成的 Token** (只显示一次，请妥善保管!)

**配置步骤:**
1. 点击右上角的 ☁️ 按钮
2. 选择"GitHub Gist"
3. 粘贴刚才复制的 GitHub Token
4. 点击"测试连接"验证 Token 是否有效
5. 验证成功后会自动填充 GitHub 用户名
6. 点击"创建新 Gist"(第一次使用) 或输入已有的 Gist ID
7. 点击"保存配置"
8. 点击"立即同步"上传数据

**跨设备同步:**
1. 在设备 A 上配置好 GitHub Gist 并同步数据
2. 在设备 B 上安装扩展
3. 使用相同的 GitHub Token 配置
4. 点击"从云端加载"即可获取设备 A 的数据

### 最佳实践

1. **定期手动备份**: 即使开启了自动同步，也建议定期点击"立即同步"
2. **本地导出**: 重要数据使用"导入导出"功能导出 JSON 文件
3. **Token 安全**: 不要分享您的 GitHub Token，泄露后立即删除并重新生成
4. **Gist 管理**: 可在 https://gist.github.com 查看和管理您的 Gist

### 故障排查

**Chrome Storage Sync 不工作:**
- 检查是否已登录 Chrome 浏览器
- 确认同步功能已开启
- 检查网络连接

**GitHub Gist 连接失败:**
- 验证 Token 是否正确 (注意大小写)
- 确认 Token 未过期
- 检查是否勾选了 `gist` 权限
- 尝试重新生成 Token

**数据冲突:**
- 如果多个设备同时修改，后同步的会覆盖先同步的
- 建议每次只在一个设备上编辑
- GitHub Gist 可在网站上查看历史版本并恢复

### 本地存储
如果不启用云同步，数据将仅存储在本地。

## 技术架构

- **框架**: React v19.2.4 + TypeScript
- **构建工具**: Vite v8.0.1
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **拖拽库**: @dnd-kit
- **存储方案**: 
  - Chrome Storage Local/Sync
  - GitHub Gist API
  - localStorage (开发环境)

## 开发指南

本模板提供了在 Vite 中使用 React 的最小化设置，支持 HMR 和一些 ESLint 规则。

目前可用的两个官方插件：

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) 使用 [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) 使用 [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])