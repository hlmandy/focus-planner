# Focus Planner — 项目架构

本地优先的学术科研工作台（React 19 + Vite + Hono + SQLite）。

## 目录结构

```
focus-planner/
├── src/
│   ├── App.tsx              # 应用壳：Provider + 路由 + 核心状态
│   ├── App.css              # 全局样式入口（@import styles/）
│   ├── main.tsx             # Vite 入口
│   ├── types.ts             # 所有 TypeScript 类型定义
│   ├── utils.ts             # 纯函数：日期、时间、UID、解析等
│   ├── constants.ts         # 常量：标签、模板、节假日、默认值
│   ├── seed.ts              # 种子数据、状态归一化、localStorage 加载
│   ├── hooks/
│   │   └── useAppContext.tsx # React Context：全局共享状态
│   ├── pages/               # 页面组件（各自通过 useApp() 获取上下文）
│   │   ├── PlannerPage.tsx  # 周规划时间线
│   │   ├── TodayPage.tsx    # 今日概览 + TODO
│   │   ├── DiaryPage.tsx    # 研究日记
│   │   ├── LiteraturePage.tsx # 文献库
│   │   ├── HabitsPage.tsx   # 习惯追踪
│   │   ├── SummaryPage.tsx  # Markdown 日总结导出
│   │   └── SettingsPage.tsx # 设置 + 数据管理
│   ├── components/          # 共享 UI 组件
│   │   ├── Sidebar.tsx      # 左侧导航栏
│   │   └── ToolPanel.tsx    # 右侧工具面板（番茄钟、日历、快速添加）
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
│   ├── types.ts             # 后端类型定义（独立拷贝，需手动同步 src/types.ts）
│   ├── validate.ts          # 入参校验（requireFields, jsonField 等）
│   └── routes/              # 按实体的 CRUD 路由
├── data/                    # SQLite 数据库 + 备份
├── eslint.config.js         # ESLint：src/(browser) + server/(node) 分离配置
└── docs/
    ├── TODO.md              # 待办事项
    └── RESEARCH_WORKFLOW.md # 科研工作流说明
```

## 核心架构

- **前端**：React 19 + Vite 8 + TypeScript，运行在 localhost:5173
- **后端**：Hono + better-sqlite3，运行在 localhost:8787
- **状态同步**：前端 useState 管理 AppState，通过 localStorage + PUT /api/state 双写
- **数据模型**：8 种实体（Project, Task, ScheduleBlock, Habit, HabitEntry, ThesisStudent, ResearchLogEntry, PomodoroSession），定义在 `src/types.ts`
- **测试**：vitest，覆盖 utils 纯函数和 seed 状态归一化/迁移逻辑
- **启动**：`start-focus-planner.bat` 同时启动后端和前端

## 数据流

1. App 组件初始化时，`loadState()` 先从 localStorage 读取
2. `useEffect` 尝试 GET `/api/state`，如果服务器可用则用服务器数据覆盖
3. 每次 state 变化，写 localStorage + 延迟 500ms PUT 到服务器
4. 番茄钟完成时自动创建 PomodoroSession 记录

## 关键约定

- **不重复定义**：types/constants/utils/seed 都有独立文件，不要在 App.tsx 中重新定义
- **Task.source** 区分真实任务 (`'task'`) 和日程占位 (`'schedule'`)
  - 拖拽创建的时间块初始为 `source: 'schedule'`
  - 在编辑器中填写标题后自动提升为 `source: 'task'`（出现在 TodayPage 和项目视图）
  - 删除时间块时，无其他 block 引用的 `source: 'schedule'` Task 一并清除
- **Project.kind** 决定模板和 UI 呈现：research/paper/student/admin
- **CSS** 在 `styles/` 目录按组件拆分，通过 `App.css` 的 `@import` 汇总
- **ESLint** 分两套配置：`src/` 用 browser globals + React 插件，`server/` 用 node globals
- **后端路由**已按实体拆分为独立文件，保持这个模式
- **server/types.ts** 与 **src/types.ts** 是独立拷贝，修改一方需手动同步另一方

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
