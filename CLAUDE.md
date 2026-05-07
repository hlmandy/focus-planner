# Focus Planner — 项目架构速查

本地优先的学术科研工作台（React 19 + Vite 8 + Hono + SQLite）。

## 目录结构

```
focus-planner/
├── src/
│   ├── App.tsx              # 薄壳（~150行）：Provider + persistence + pomodoro + 路由
│   ├── App.css              # @import 汇总（实际样式在 styles/ 下 13 个文件）
│   ├── main.tsx             # Vite 入口
│   ├── types.ts             # 所有 TypeScript 类型（8种实体 + AppState + PageName）
│   ├── utils.ts             # 纯函数：日期、时间、UID、解析
│   ├── constants.ts         # 常量：标签、模板、节假日、默认值、STORAGE_KEY
│   ├── seed.ts              # 种子数据、状态归一化（normalizeState）、loadState
│   ├── hooks/
│   │   └── useAppContext.tsx # React Context：全局状态 + 导航 + 番茄钟状态
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
│   │   ├── diary.css        # 研究日记
│   │   ├── habits.css       # 习惯追踪
│   │   ├── summary-settings.css
│   │   └── responsive.css   # 媒体查询
│   ├── pages/               # 页面组件（各自通过 useApp() 获取上下文）
│   │   ├── PlannerPage.tsx  # 周规划时间线（含时间块 CRUD、拖拽、编辑器）
│   │   ├── ProjectsPage.tsx # 项目管理（卡片、详情、任务树、论文指导）
│   │   ├── TodayPage.tsx    # 今日概览 + TODO 条
│   │   ├── DiaryPage.tsx    # 研究日记
│   │   ├── LiteraturePage.tsx # 文献库
│   │   ├── HabitsPage.tsx   # 习惯追踪
│   │   ├── SummaryPage.tsx  # Markdown 日总结导出
│   │   └── SettingsPage.tsx # 设置 + 数据管理
│   └── components/          # 共享 UI 组件
│       ├── Sidebar.tsx      # 左侧导航栏（含项目创建）
│       └── ToolPanel.tsx    # 右侧工具面板（番茄钟、快速添加、日历）
├── server/                  # Hono 后端
│   ├── index.ts             # 路由注册
│   ├── db.ts                # SQLite schema + 迁移 + 备份
│   ├── types.ts / validate.ts
│   └── routes/              # 按实体的 CRUD 路由（13 个文件）
├── docs/                    # 文档
│   ├── TODO.md              # 待办清单（按 P0-P4 优先级排列）
│   └── RESEARCH_WORKFLOW.md # 研究工作流领域文档
└── data/                    # SQLite 数据库 + 备份
```

## 数据流

1. `App.tsx` 初始化时 `loadState()` 从 localStorage 读取
2. `useEffect` 尝试 `GET /api/state`，服务器可用则覆盖
3. 每次 state 变化 → 写 localStorage + 延迟 500ms `PUT /api/state`
4. 番茄钟完成 → 自动创建 `PomodoroSession` 记录

## 编码约定

- **不重复定义**：types / constants / utils / seed 各有独立文件，不要在其他文件重新定义
- **页面组件模式**：每个 page 通过 `useApp()` 获取 state 和 setter，表单状态用本地 useState
- **样式**：改哪个组件就改 `styles/` 下对应文件，不要加到别处
- **后端路由**：按实体拆分，保持一个文件一个实体

## 常用命令

```bash
cd focus-planner
npm run dev      # 前端 dev server (localhost:5173)
npm run server   # 后端 data server (localhost:8787)
npm run build    # 构建生产版本
npm run lint     # ESLint 检查
```
