# Focus Planner — 项目架构速查

本地优先的学术科研工作台（React 19 + Vite 8 + Hono + SQLite）。

## 目录结构

```
focus-planner/
├── shared/
│   └── types.ts             # 前后端共享类型定义（单一数据源）
├── src/
│   ├── App.tsx              # 应用壳：Provider + react-router + 动态 header 标题
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
│   │   ├── useAppContext.tsx # React Context：组合 8 个 entity hooks + settings + UI state
│   │   ├── useEntityResource.ts # 通用 CRUD hook（乐观更新 + 回滚 + 缓存）
│   │   ├── useScheduleActions.ts # 跨实体业务层：ScheduleBlock + Task 联动（diary/task block 创建、转换、删除）
│   │   ├── usePomodoroTimer.tsx # 番茄钟 + 秒表持续运行状态（Provider + Context，localStorage 持久化）
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
│   │   ├── TodayPage.tsx    # 今日概览 + diary/task 双模式日程 + 项目记录
│   │   ├── ResearchLogPage.tsx # 研究日记 + 文献库（统一页面，支持编辑）
│   │   ├── HabitsPage.tsx   # 习惯追踪（周视图）
│   │   ├── SummaryPage.tsx  # Markdown 日总结 + 项目报告导出
│   │   └── SettingsPage.tsx # 设置 + 数据管理 + CalDAV 同步配置
│   └── components/          # 共享 UI 组件
│       ├── Sidebar.tsx      # 左侧导航栏（NavLink 路由 + 项目创建 + 归档折叠）
│       └── ToolPanel.tsx    # 右侧工具面板（番茄钟、全局搜索、快速添加、日历）
├── server/                  # Hono 后端
│   ├── index.ts             # 路由注册（14 个路由模块）
│   ├── db.ts                # SQLite schema + 迁移 + 备份
│   ├── types.ts             # re-export shared types + SQLite row 类型
│   ├── validate.ts          # 入参校验（requireFields, jsonField 等）
│   ├── caldav-client.ts     # CalDAV HTTP 协议层（PROPFIND/PUT/DELETE、ICS 构建）
│   ├── caldav-sync.ts       # CalDAV 同步引擎（变更检测、创建/更新/删除流程）
│   └── routes/              # 按实体的 CRUD 路由（14 个文件）
├── docs/                    # 文档
│   └── TODO.md              # 待办清单（按 P0-P4 优先级排列）
├── data/                    # SQLite 数据库 + 备份
├── eslint.config.js         # ESLint：src/(browser) + server/(node) 分离配置
└── src/__tests__/           # vitest 测试（utils + seed，共 36 个）
```

## 核心架构

- **前端**：React 19 + Vite 8 + TypeScript，运行在 localhost:5173
- **后端**：Hono + better-sqlite3，运行在 localhost:8787
- **类型共享**：`shared/types.ts` 是前后端类型的单一数据源，不再手动同步
- **数据模型**：8 种实体（Project, Task, ScheduleBlock, Habit, HabitEntry, ThesisStudent, ResearchLogEntry, PomodoroSession）+ UserSettings
- **状态管理层**（三层分离）：
  - `useEntityResource` — 单实体 CRUD、乐观更新、回滚、localStorage 缓存
  - `useScheduleActions` — ScheduleBlock + Task 跨实体业务动作（创建 diary/task block、转换、删除联动）
  - `usePomodoroTimer` / `useStopwatchTimer` — 持续运行计时器状态（Provider + Context，localStorage 持久化）
- **测试**：vitest，覆盖 utils 纯函数和 seed 状态归一化/迁移逻辑（36 个测试）
- **API client**：`src/api/client.ts` 统一 fetch 封装，`ApiError` 类型区分 HTTP 错误
- **路由**：react-router（`BrowserRouter`），`NavLink` / `navigate()` 导航，`useParams` 获取 URL 参数

## 数据流

1. App 初始化时从 localStorage 读取（`loadState()`），entity hooks mount 时从各 REST API 拉取最新数据
2. 每次 CRUD 操作 → 立即更新本地 state（乐观更新）→ 异步调用对应 REST API → 失败时回滚
3. 离线时 API 调用失败 → 本地 state 保持 → localStorage 缓存作为下次启动兜底
4. 番茄钟完成 → `PomodoroTimerProvider` 调用 `pomodoroSessions.create()` 乐观更新本地 state + API 同步
5. CalDAV 同步由后端独立触发（`PUT /api/state` 时或手动触发），前端不直接参与
6. 前端路由使用 react-router（`BrowserRouter`），导航通过 `NavLink` / `navigate()` 而非 `setPage()` state
7. Schedule 相关写操作走 `useScheduleActions`（创建 diary/task block、转换类型、删除联动 Task）

## API 架构

前端通过 `src/api/` 按实体调用细粒度 REST API：

| 实体            | 列出                         | 创建                          | 更新                             | 删除                                |
| --------------- | ---------------------------- | ----------------------------- | -------------------------------- | ----------------------------------- |
| Project         | `GET /api/projects`          | `POST /api/projects`          | `PUT /api/projects/:id`          | `DELETE /api/projects/:id`          |
| Task            | `GET /api/tasks`             | `POST /api/tasks`             | `PUT /api/tasks/:id`             | `DELETE /api/tasks/:id`             |
| Block           | `GET /api/blocks`            | `POST /api/blocks`            | `PUT /api/blocks/:id`            | `DELETE /api/blocks/:id`            |
| Habit           | `GET /api/habits`            | `POST /api/habits`            | `PUT /api/habits/:id`            | `DELETE /api/habits/:id`            |
| HabitEntry      | `GET /api/habit-entries`     | `POST /api/habit-entries`     | `PUT /api/habit-entries/:id`     | `DELETE /api/habit-entries/:id`     |
| ThesisStudent   | `GET /api/thesis-students`   | `POST /api/thesis-students`   | `PUT /api/thesis-students/:id`   | `DELETE /api/thesis-students/:id`   |
| ResearchLog     | `GET /api/research-logs`     | `POST /api/research-logs`     | `PUT /api/research-logs/:id`     | `DELETE /api/research-logs/:id`     |
| PomodoroSession | `GET /api/pomodoro-sessions` | `POST /api/pomodoro-sessions` | `PUT /api/pomodoro-sessions/:id` | `DELETE /api/pomodoro-sessions/:id` |
| UserSettings    | `GET /api/settings`          | `PUT /api/settings`           | —                                | —                                   |

另有：

- `GET/PUT /api/state` — 全量同步（兼容/备份）
- `GET /api/search?q=` — 全局搜索（跨项目/任务/日记/学生）
- `GET/PUT /api/caldav/config` — CalDAV 配置
- `POST /api/caldav/test-connection` — 测试 CalDAV 连接
- `POST /api/caldav/sync` — 手动触发 CalDAV 同步
- `GET /api/caldav/status` — 同步状态
- `POST /api/backups` — 触发备份
- `GET /api/health` — 健康检查

## 状态管理层

### Entity Hook（单实体 CRUD）

每个实体 hook 返回 `{ items, setItems, error, create, update, remove, delete }`：

```ts
// 乐观更新：立即改本地 state，后台调 API
projects.create({ id: uid(), name: '新项目', ... })
tasks.update(taskId, { done: true })
tasks.delete(taskId)  // 或 tasks.remove(taskId)
```

### useScheduleActions（ScheduleBlock + Task 联动）

Schedule 相关写操作**必须**走 `useScheduleActions`，不要在页面里直接实现跨 Task + ScheduleBlock 的业务逻辑。

```ts
const actions = useScheduleActions()

// 创建普通日程（不关联 Task）
actions.createDiaryBlock({ date, start, end, title, category })

// 创建项目任务 block（同时创建 Task + ScheduleBlock）
actions.createTaskBlock({ date, start, end, title, projectId })

// 排期已有 Task
actions.scheduleExistingTask({ taskId, date, start, duration })

// 转换 block 类型
actions.convertDiaryToTask(blockId, projectId)
actions.convertTaskBlockToDiary(blockId)

// 删除 block（自动清理孤立 schedule placeholder Task）
actions.deleteBlock(blockId)
```

### usePomodoroTimer / useStopwatchTimer（计时器运行状态）

番茄钟和秒表通过 Provider + Context 管理，计时状态持久化到 localStorage，页面刷新后恢复。

```ts
const timer = usePomodoroTimer()
timer.start() / timer.pause() / timer.reset()
timer.adjustMinutes(5) / timer.setMinutes(30)
timer.switchMode('break')

const stopwatch = useStopwatchTimer()
stopwatch.start() / stopwatch.pause() / stopwatch.reset()
```

## CalDAV 同步

- **协议层**：`server/caldav-client.ts` — 纯 HTTP 封装，使用 Node.js `fetch`
- **同步引擎**：`server/caldav-sync.ts` — 读 DB → 比对 content hash → 创建/更新/删除远程事件
- **映射表**：`caldav_sync_map` 表存储 block_id ↔ event_url/etag 的映射
- **配置表**：`caldav_config` 单行表存储 CalDAV 凭据（Settings 页面管理）
- **时间转换**：ScheduleBlock 的 date + start/end (分钟) → iCalendar DTSTART/DTEND

## TodayPage 双模式日程

TodayPage 的"今天的安排"支持两种日程类型：

- **普通日程**（`blockType: 'diary'`）：`taskId: null`，直接创建 `ScheduleBlock`，不关联 Task。用于带娃、吃饭、通勤、休息等非项目事务
- **项目任务**（`blockType: 'task'`）：创建 Task + ScheduleBlock，关联项目。用于改论文、跑实验等项目工作

UI 上通过类型选择器切换，默认"普通日程"。diary block 不显示完成状态按钮、不显示"转为研究日志"按钮、编辑表单隐藏项目选择器和完成 checkbox。

"快速记录"已改名为"项目记录"，保留 project-based research log 的定性。

## 关键约定

- **类型共享**：`shared/types.ts` 是前后端类型的单一数据源，修改实体类型只需改这里
- **不重复定义**：types / constants / utils / seed 各有独立文件，不要在其他文件重新定义
- **页面组件模式**：每个 page 通过 `useApp()` 获取 entity hooks，表单状态用本地 useState
- **Schedule 业务边界**：ScheduleBlock + Task 的跨实体写操作走 `useScheduleActions`，PlannerPage / TodayPage 不直接实现联动逻辑
- **计时器状态**：番茄钟和秒表走 `PomodoroTimerProvider` / `StopwatchTimerProvider`，不放在页面组件里
- **路由**：react-router 管理页面导航，`useParams` 获取 URL 参数（如 `projectId`），不再用 `page` state 切换
- **Task.source** 区分真实任务 (`'task'`) 和日程占位 (`'schedule'`)
  - `source: 'task'` 是用户明确创建的项目任务
  - `source: 'schedule'` 是旧迁移遗留的空占位 Task，`normalizeState` 中自动推断
  - 删除时间块时，`useScheduleActions.deleteBlock` 自动清理无其他 block 引用的 schedule placeholder Task
- **ScheduleBlock.blockType** 区分项目任务 (`'task'`) 和普通日程 (`'diary'`)
  - `task block`：关联 Task（`taskId` 非空），用于项目工作排程
  - `diary block`：不关联 Task（`taskId: null`），用于带娃、吃饭、通勤等非项目日程
- **Project.kind** 决定模板和 UI 呈现：`research` / `admin`（旧 `paper`/`student` 在 `normalizeKind` 中映射到 `research`/`admin`）
- **seedState** 返回空数组（无 demo 数据），首次启动时无预填项目
- **ResearchLogEntry** 新增字段：`readingStatus`（unread/reading/read/reviewed）、`keyFindings`（关键结论）、`nextAction`（下一步行动）
- **项目管理筛选器**（kind/status）持久化到 localStorage，刷新不丢失
- **侧栏**支持展开/折叠已归档项目列表（localStorage 持久化）
- **SummaryPage** 支持单项目 Markdown 导出（任务树 + 日记 + 时间块 + 新字段）
- **ToolPanel** 包含番茄钟（计时逻辑 + 时间调节控件 + 历史管理）、全局搜索（跨项目/任务/日记/学生）、快速添加和日历
- **ResearchLogPage**（研究日记 + 文献库统一页面）支持编辑已有记录（标题/来源/笔记/附件/阅读状态/关键结论/下一步）
- **样式**：改哪个组件就改 `styles/` 下对应文件，不要加到别处
- **ESLint**：两套配置，`src/` 用 browser globals + React 插件，`server/` 用 node globals
- **后端路由**：按实体拆分为独立文件，保持这个模式

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
