# Focus Planner — 项目架构

本地优先的学术科研工作台（React 19 + Vite + Hono + SQLite）。

## 目录结构

```
focus-planner/
├── src/
│   ├── App.tsx              # 应用壳：Provider + 路由 + 核心状态
│   ├── App.css              # 全局样式
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
│   └── components/          # 共享 UI 组件
│       ├── Sidebar.tsx      # 左侧导航栏
│       └── ToolPanel.tsx    # 右侧工具面板（番茄钟、日历、快速添加）
├── server/                  # Hono 后端
│   ├── index.ts             # 路由注册
│   ├── db.ts                # SQLite schema + 迁移 + 备份
│   ├── types.ts / validate.ts
│   └── routes/              # 按实体的 CRUD 路由（13 个文件）
└── data/                    # SQLite 数据库 + 备份
```

## 核心架构

- **前端**：React 19 + Vite 8 + TypeScript，运行在 localhost:5173
- **后端**：Hono + better-sqlite3，运行在 localhost:8787
- **状态同步**：前端 useState 管理 AppState，通过 localStorage + PUT /api/state 双写
- **数据模型**：8 种实体（Project, Task, ScheduleBlock, Habit, HabitEntry, ThesisStudent, ResearchLogEntry, PomodoroSession），定义在 `src/types.ts`
- **启动**：`start-focus-planner.bat` 同时启动后端和前端

## 数据流

1. App 组件初始化时，`loadState()` 先从 localStorage 读取
2. `useEffect` 尝试 GET `/api/state`，如果服务器可用则用服务器数据覆盖
3. 每次 state 变化，写 localStorage + 延迟 500ms PUT 到服务器
4. 番茄钟完成时自动创建 PomodoroSession 记录

## 关键约定

- **不重复定义**：types/constants/utils/seed 都有独立文件，不要在 App.tsx 中重新定义
- **Task.source** 区分真实任务 (`'task'`) 和日程占位 (`'schedule'`)
- **Project.kind** 决定模板和 UI 呈现：research/paper/student/admin
- **CSS** 在 App.css 中统一管理，按页面区块组织
- **后端路由**已按实体拆分为独立文件，保持这个模式

## 常用命令

```bash
cd focus-planner
npm run dev      # 启动前端 dev server
npm run server   # 启动后端 data server
npm run build    # 构建生产版本
npm run lint     # ESLint 检查
```
