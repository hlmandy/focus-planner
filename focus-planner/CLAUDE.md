# Focus Planner — 项目架构

本地优先的学术科研工作台（React 19 + Vite 8 + Hono + SQLite）。

## 目录结构

```
focus-planner/
├── shared/
│   └── types.ts             # 前后端共享类型定义（单一数据源）
├── src/
│   ├── App.tsx              # 应用壳：Provider + 路由 + PomodoroTimer
│   ├── App.css              # 全局样式入口（@import styles/）
│   ├── main.tsx             # Vite 入口
│   ├── types.ts             # re-export shared types + LegacyState（迁移兼容）
│   ├── utils.ts             # 纯函数：日期、时间、UID、解析等
│   ├── constants.ts         # 常量：标签、模板、节假日、默认值
│   ├── seed.ts              # 种子数据、状态归一化、localStorage 加载
│   ├── api/                 # API 调用层
│   │   ├── client.ts        # fetch 封装 + ApiError
│   │   ├── index.ts         # 统一导出
│   │   ├── projects.ts      # 各实体 API 函数
│   │   ├── tasks.ts
│   │   ├── blocks.ts
│   │   ├── habits.ts
│   │   ├── habit-entries.ts
│   │   ├── thesis-students.ts
│   │   ├── research-logs.ts
│   │   └── pomodoro.ts
│   ├── hooks/
│   │   ├── useEntityResource.ts  # 通用 CRUD hook（乐观更新 + 回滚 + 缓存）
│   │   ├── useProjects.ts        # 各实体 hook（组合通用 hook + API）
│   │   ├── useTasks.ts
│   │   ├── useBlocks.ts
│   │   ├── useHabits.ts
│   │   ├── useHabitEntries.ts
│   │   ├── useThesisStudents.ts
│   │   ├── useResearchLogs.ts
│   │   ├── usePomodoroSessions.ts
│   │   └── useAppContext.tsx     # React Context：组合 8 个 entity hooks
│   ├── pages/               # 页面组件（通过 useApp() 获取 entity hooks）
│   │   ├── PlannerPage.tsx  # 周规划时间线
│   │   ├── TodayPage.tsx    # 今日概览 + TODO
│   │   ├── ProjectsPage.tsx # 项目管理
│   │   ├── DiaryPage.tsx    # 研究日记
│   │   ├── LiteraturePage.tsx # 文献库
│   │   ├── HabitsPage.tsx   # 习惯追踪
│   │   ├── SummaryPage.tsx  # Markdown 日总结导出（只读）
│   │   └── SettingsPage.tsx # 设置 + 数据管理 + CalDAV 同步配置
│   ├── components/          # 共享 UI 组件
│   │   ├── Sidebar.tsx      # 左侧导航栏（含项目创建）
│   │   └── ToolPanel.tsx    # 右侧工具面板（番茄钟、快速添加、日历）
│   ├── styles/              # 组件级 CSS（13 个文件）
│   │   ├── variables.css    # CSS 变量 / 主题色
│   │   ├── shell.css        # 应用外壳 grid 布局
│   │   ├── base.css         # 全局 reset + 共享按钮样式
│   │   ├── sidebar.css
│   │   ├── workspace.css
│   │   ├── tool-panel.css
│   │   ├── planner.css      # 时间线 + 时间块 + 编辑器（最大区块）
│   │   ├── today.css
│   │   ├── projects.css
│   │   ├── diary.css
│   │   ├── habits.css
│   │   ├── summary-settings.css
│   │   └── responsive.css   # 媒体查询
│   └── __tests__/           # vitest 测试
│       ├── utils.test.ts    # 纯函数测试（20 个）
│       └── seed.test.ts     # 状态归一化/迁移测试（16 个）
├── server/                  # Hono 后端
│   ├── index.ts             # 路由注册
│   ├── db.ts                # SQLite schema + 迁移 + 备份
│   ├── types.ts             # re-export shared types
│   ├── validate.ts          # 入参校验（requireFields, jsonField 等）
│   ├── caldav-client.ts     # CalDAV HTTP 协议层
│   ├── caldav-sync.ts       # CalDAV 同步引擎
│   └── routes/              # 按实体的 CRUD 路由（14 个文件）
├── data/                    # SQLite 数据库 + 备份
├── eslint.config.js         # ESLint：src/(browser) + server/(node) 分离配置
└── docs/
    ├── TODO.md              # 待办事项
    └── RESEARCH_WORKFLOW.md # 科研工作流说明
```

## 核心架构

- **前端**：React 19 + Vite 8 + TypeScript，运行在 localhost:5173
- **后端**：Hono + better-sqlite3，运行在 localhost:8787
- **类型共享**：`shared/types.ts` 是前后端类型的单一数据源，不再手动同步
- **数据模型**：8 种实体（Project, Task, ScheduleBlock, Habit, HabitEntry, ThesisStudent, ResearchLogEntry, PomodoroSession）
- **状态管理**：按实体的 entity hooks（乐观更新 + API 同步 + localStorage 缓存兜底）
- **测试**：vitest，覆盖 utils 纯函数和 seed 状态归一化/迁移逻辑

## 数据流

1. App 初始化时从 localStorage 读取（`loadState()`），entity hooks mount 时从各 REST API 拉取最新数据
2. 每次 CRUD 操作 → 立即更新本地 state（乐观更新）→ 异步调用对应 REST API → 失败时回滚
3. 离线时 API 调用失败 → 本地 state 保持 → localStorage 缓存作为下次启动兜底
4. 番茄钟完成 → `pomodoroSessions.create()` 乐观更新本地 state + API 同步
5. CalDAV 同步由后端独立触发（`PUT /api/state` 时或手动触发），前端不直接参与

## API 架构

前端通过 `src/api/` 按实体调用细粒度 REST API：

| 实体 | 列出 | 创建 | 更新 | 删除 |
|------|------|------|------|------|
| Project | `GET /api/projects` | `POST /api/projects` | `PUT /api/projects/:id` | `DELETE /api/projects/:id` |
| Task | `GET /api/tasks` | `POST /api/tasks` | `PUT /api/tasks/:id` | `DELETE /api/tasks/:id` |
| Block | `GET /api/blocks` | `POST /api/blocks` | `PUT /api/blocks/:id` | `DELETE /api/blocks/:id` |
| Habit | `GET /api/habits` | `POST /api/habits` | `PUT /api/habits/:id` | `DELETE /api/habits/:id` |
| HabitEntry | `GET /api/habit-entries` | `POST /api/habit-entries` | `PUT /api/habit-entries/:id` | `DELETE /api/habit-entries/:id` |
| ThesisStudent | `GET /api/thesis-students` | `POST /api/thesis-students` | `PUT /api/thesis-students/:id` | `DELETE /api/thesis-students/:id` |
| ResearchLog | `GET /api/research-logs` | `POST /api/research-logs` | `PUT /api/research-logs/:id` | `DELETE /api/research-logs/:id` |
| PomodoroSession | `GET /api/pomodoro-sessions` | `POST /api/pomodoro-sessions` | — | `DELETE /api/pomodoro-sessions/:id` |

另有 `GET/PUT /api/state`（全量同步）保留用于兼容和备份导入导出。

## Entity Hook 模式

每个实体 hook 返回 `{ items, setItems, error, create, update, remove, delete }`：

```ts
// 乐观更新：立即改本地 state，后台调 API
projects.create({ id: uid(), name: '新项目', ... })
blocks.update(blockId, { start: 90, end: 120 })
tasks.delete(taskId)  // 或 tasks.remove(taskId)

// 拖拽等高频操作：先用 setItems() 纯本地更新，结束时调 update() 同步 API
blocks.setItems(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))
// pointerup 时：
blocks.update(id, finalPatch)
```

## 关键约定

- **不重复定义**：types/constants/utils/seed 各有独立文件，不要在 App.tsx 中重新定义
- **类型共享**：修改实体类型只需改 `shared/types.ts`，前后端自动同步
- **Task.source** 区分真实任务 (`'task'`) 和日程占位 (`'schedule'`)
  - 拖拽创建的时间块初始为 `source: 'schedule'`
  - 在编辑器中填写标题后自动提升为 `source: 'task'`
  - 删除时间块时，无其他 block 引用的 `source: 'schedule'` Task 一并清除
- **Project.kind** 决定模板和 UI 呈现：research/paper/student/admin
- **CSS** 在 `styles/` 目录按组件拆分，通过 `App.css` 的 `@import` 汇总
- **ESLint** 分两套配置：`src/` 用 browser globals + React 插件，`server/` 用 node globals
- **后端路由**按实体拆分为独立文件，保持这个模式

## 常用命令

```bash
cd focus-planner
npm run dev        # 启动前端 dev server
npm run server     # 启动后端 data server
npm run build      # 构建生产版本
npm run lint       # ESLint 检查
npm run test       # 运行测试
npm run test:watch # 监听模式运行测试
```
