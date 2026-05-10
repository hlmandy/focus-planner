# Focus Planner — 项目架构速查

本地优先的学术科研工作台（React 19 + Vite 8 + Hono + SQLite）。

## 目录结构

```
focus-planner/
├── shared/
│   └── types.ts             # 前后端共享类型定义（单一数据源）
├── src/
│   ├── App.tsx              # 应用壳：Provider + 路由 + 动态 header 标题
│   ├── App.css              # @import 汇总（实际样式在 styles/ 下 13 个文件）
│   ├── main.tsx             # Vite 入口（BrowserRouter）
│   ├── types.ts             # re-export shared types + LegacyState（迁移兼容）
│   ├── utils.ts             # 纯函数：日期、时间、UID、解析
│   ├── constants.ts         # 常量：标签、模板、节假日、默认值、STORAGE_KEY
│   ├── seed.ts              # 种子数据、状态归一化（normalizeState）、loadState
│   ├── api/                 # 按实体的 API 调用函数（11 个文件）
│   │   ├── client.ts        # fetch 封装 + ApiError
│   │   ├── index.ts         # 统一导出
│   │   └── *.ts             # projects, tasks, blocks, habits, habit-entries,
│   │                        # thesis-students, research-logs, pomodoro, settings
│   ├── hooks/
│   │   ├── useAppContext.tsx # React Context：组合 8 个 entity hooks（无 page/setPage，路由替代）
│   │   ├── useEntityResource.ts # 通用 CRUD hook（乐观更新 + 回滚 + 缓存）
│   │   └── use{Entity}.ts   # 各实体 hook（projects, tasks, blocks, habits,
│   │                        # habit-entries, thesis-students, research-logs, pomodoro-sessions）
│   ├── styles/              # 按组件拆分的 CSS（共 13 个文件）
│   │   ├── variables.css    # CSS 自定义属性
│   │   ├── shell.css        # app-shell grid 布局
│   │   ├── base.css         # 全局 reset + 共享按钮样式
│   │   ├── sidebar.css      # 侧栏
│   │   ├── workspace.css    # 工作区 + 页头
│   │   ├── tool-panel.css   # 右侧工具面板
│   │   ├── planner.css      # 规划表 + 时间块 + 编辑器
│   │   ├── today.css        # 今日页
│   │   ├── projects.css     # 项目管理页
│   │   ├── research-log.css # 研究日记 + 文献库
│   │   ├── habits.css       # 习惯追踪
│   │   ├── summary-settings.css
│   │   └── responsive.css   # 媒体查询
│   ├── pages/               # 页面组件（通过 useApp() 获取 entity hooks）
│   │   ├── PlannerPage.tsx  # 周规划时间线（含时间块 CRUD、拖拽、编辑器）
│   │   ├── ProjectsPage.tsx # 项目管理（路由 /projects 和 /projects/:projectId）
│   │   ├── TodayPage.tsx    # 今日概览 + TODO 条
│   │   ├── ResearchLogPage.tsx # 研究日记 + 文献库（统一页面，支持编辑）
│   │   ├── HabitsPage.tsx   # 习惯追踪
│   │   ├── SummaryPage.tsx  # Markdown 日总结 + 项目报告导出
│   │   └── SettingsPage.tsx # 设置 + 数据管理 + CalDAV 同步配置
│   └── components/          # 共享 UI 组件
│       ├── Sidebar.tsx      # 左侧导航栏（NavLink 路由 + 项目创建 + 归档折叠）
│       └── ToolPanel.tsx    # 右侧工具面板（番茄钟、全局搜索、快速添加、日历）
├── server/                  # Hono 后端
│   ├── index.ts             # 路由注册（14 个路由模块）
│   ├── db.ts                # SQLite schema + 迁移 + 备份
│   ├── types.ts             # re-export shared types + SQLite row 类型
│   ├── validate.ts          # 入参校验
│   ├── caldav-client.ts     # CalDAV HTTP 协议层（PROPFIND/PUT/DELETE、ICS 构建）
│   ├── caldav-sync.ts       # CalDAV 同步引擎（变更检测、创建/更新/删除流程）
│   └── routes/              # 按实体的 CRUD 路由（13 个文件 + caldav.ts）
├── docs/                    # 文档
│   └── TODO.md              # 待办清单（按 P0-P4 优先级排列）
├── data/                    # SQLite 数据库 + 备份
├── eslint.config.js         # ESLint：src/(browser) + server/(node) 分离配置
└── src/__tests__/           # vitest 测试（utils + seed，共 36 个）
```

## 数据流

1. App 初始化时从 localStorage 读取（`loadState()`），entity hooks mount 时从各 REST API 拉取最新数据
2. 每次 CRUD 操作 → 立即更新本地 state（乐观更新）→ 异步调用对应 REST API → 失败时回滚
3. 离线时 API 调用失败 → 本地 state 保持 → localStorage 缓存作为下次启动兜底
4. 番茄钟完成 → `pomodoroSessions.create()` 乐观更新本地 state + API 同步
5. CalDAV 同步由后端独立触发（全量同步时或手动触发），前端不直接参与
6. 前端路由使用 react-router（`BrowserRouter`），导航通过 `NavLink` / `navigate()` 而非 `setPage()` state

## API 架构

前端通过 `src/api/` 按实体调用细粒度 REST API（详见 `focus-planner/CLAUDE.md`）。

另有辅助路由：`GET/PUT /api/state`（全量同步兼容）、`GET /api/search`（全局搜索）、`/api/caldav/*`（CalDAV 配置/同步）、`/api/backups`（备份）、`/api/health`（健康检查）。

## CalDAV 同步

- **协议层**：`server/caldav-client.ts` — 纯 HTTP 封装，使用 Node.js `fetch`
- **同步引擎**：`server/caldav-sync.ts` — 读 DB → 比对 content hash → 创建/更新/删除远程事件
- **映射表**：`caldav_sync_map` 表存储 block_id ↔ event_url/etag 的映射
- **配置表**：`caldav_config` 单行表存储 CalDAV 凭据（Settings 页面管理）
- **时间转换**：ScheduleBlock 的 date + start/end (分钟) → iCalendar DTSTART/DTEND

## 关键约定

- **类型共享**：`shared/types.ts` 是前后端类型的单一数据源，修改实体类型只需改这里
- **不重复定义**：types / constants / utils / seed 各有独立文件，不要在其他文件重新定义
- **页面组件模式**：每个 page 通过 `useApp()` 获取 entity hooks，表单状态用本地 useState
- **路由**：react-router 管理页面导航，`useParams` 获取 URL 参数（如 `projectId`），不再用 `page` state 切换
- **Task.source** 区分真实任务 (`'task'`) 和日程占位 (`'schedule'`)
- **样式**：改哪个组件就改 `styles/` 下对应文件，不要加到别处
- **后端路由**：按实体拆分，保持一个文件一个实体
- **ESLint**：两套配置，`src/` 用 browser globals，`server/` 用 node globals

## 常用命令

```bash
cd focus-planner
npm run dev        # 前端 dev server (localhost:5173)
npm run server     # 后端 data server (localhost:8787)
npm run build      # 构建生产版本
npm run lint       # ESLint 检查
npm run test       # 运行测试
npm run test:watch # 监听模式运行测试
npm run typecheck  # TypeScript 类型检查
npm run check      # typecheck + lint + test 一键全检
```
