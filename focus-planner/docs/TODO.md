# TODO

This list intentionally excludes Zotero integration, DOI auto-completion, PDF metadata extraction, and retrospective analytics until the user explicitly asks for them.

---

## P0: 代码健康（重构遗留 & 死代码清理）

- [x] **清理 App.tsx 遗留问题**
  - `pageLabels` 重复定义：删除 App.tsx 本地的，改用 `import { pageLabels } from './constants'`
  - `page` state 类型应为 `PageName` 而非 `string`
  - `localStorage key` 应统一使用 `STORAGE_KEY` 常量（`constants.ts` 已导出但无人使用）
- [x] **清理 ToolPanel.tsx 未使用的 import**：`getWeekDays`, `weekDayText`, `Paperclip`
- [x] **清理 App.css 死样式**：`.add-habit-center`, `.week-picker`, `.week-picker-day`, `.time-block.overdue`（定义了但从未使用）
- [x] **类型一致性**：`useAppContext.tsx` 中 `persistenceStatus` 应使用 `PersistenceStatus` 类型而非 `string`
- [ ] **服务端类型同步**：`server/types.ts` 与 `src/types.ts` 是两份独立拷贝，类型可能漂移。应改为共享或自动同步

## P1: 拆分 CSS（降低单文件 token 消耗）

- [x] **拆分 App.css（2222 行）为组件级 CSS** → 13 个文件，通过 `@import` 汇总
  - `styles/variables.css` — CSS 变量 / 主题色
  - `styles/shell.css` — 应用外壳 grid 布局
  - `styles/base.css` — 全局 reset + 共享按钮样式
  - `styles/sidebar.css`
  - `styles/workspace.css` — 工作区 + 页头
  - `styles/tool-panel.css`
  - `styles/planner.css` — 时间线 + 时间块 + 编辑器（最大区块）
  - `styles/today.css`
  - `styles/projects.css`
  - `styles/diary.css`
  - `styles/habits.css`
  - `styles/summary-settings.css`
  - `styles/responsive.css` — 媒体查询

## P2: 功能优化（用户体验提升）

- [ ] 文献记录增加结构化字段：阅读状态、关键结论、下一步
- [ ] 项目管理筛选器记住上次选择（type/status）
- [ ] 支持自定义项目模板（不再仅限内置默认）
- [ ] 毕业论文指导增强：进度筛选、逾期高亮、每学生关联任务
- [ ] 任务树支持拖拽排序和重新归属（reorder / reparent）
- [ ] 番茄钟记录支持手动修正（改项目、改时长）
- [ ] 研究日记和文献记录支持编辑（目前只能新增/删除）
- [ ] 项目详情页的日记/文献/附件列表支持"查看更多"（目前只显示前 5-10 条）
- [ ] 日程占位→真实任务的明确转化流程

## P3: 搜索与导出

- [ ] 全局搜索：跨项目、日记、文献、笔记、附件索引
- [ ] 搜索结果支持按记录类型、项目类型、日期范围筛选
- [ ] 附件索引页：列出所有已记录的附件（跨项目汇总）
- [ ] 附件类型区分优化：文件路径 vs 链接 vs 纯文件名
- [ ] 单项目 Markdown 导出：包含任务、日记、文献、附件索引

## P4: 工具与基础设施

- [ ] **添加测试框架**（vitest + react-testing-library），先覆盖 state normalization 和迁移逻辑
- [ ] 服务端 pomodoro POST 路由缺少入参校验（其他路由有 `requireFields`）
- [ ] 清理 `server/focus-planner-server.mjs`（已弃用的旧 JSON 服务器）
- [ ] `server/routes/backups.ts` 接受 `db` 参数但从未使用
- [ ] `index.html` 标题改为 "Focus Planner" 而非 "focus-planner"
- [ ] ESLint 配置：server 端 TS 文件被当作 browser 全局变量 lint，应分离配置

## Later

- [ ] 可选的本地附件文件管理
- [ ] 点击打开本地文件（受浏览器安全限制）
- [ ] 应用内 JSON 备份导入导出
- [ ] 已归档项目在侧栏和非项目视图的更好展示

## Done

<!-- 2026-05 之前的功能迭代已归档，详见 git log -->

**2026-05-07** — P0 代码健康 & P1 CSS 拆分
- [x] App.tsx 去重复（pageLabels → import、page → PageName、STORAGE_KEY 统一）
- [x] 清理 ToolPanel.tsx 未使用 import（getWeekDays, weekDayText, Paperclip）
- [x] 清理 App.css 死样式（.add-habit-center, .week-picker*, .time-block.overdue）
- [x] useAppContext.persistenceStatus 类型修正为 PersistenceStatus
- [x] App.css 2222 行拆分为 13 个组件级 CSS（styles/ 目录）

**2026-05-07** — 模块化重构
- [x] App.tsx 3053 行拆为薄壳（148 行）+ Sidebar + ToolPanel + ProjectsPage 组件
- [x] 所有页面组件接入 useApp() Context，不再内联在 App.tsx
- [x] 创建 CLAUDE.md 架构文档
