# Focus Planner — 待办事项

基于 2026-05-11 文档同步后的当前状态。

---

## P0：模型一致性

- [ ] **DailyPage 标签统一**：确认所有 daily view 相关标签使用 selectedDate 语义（侧栏 "今天" 已是快捷操作，非固定页面）
- [ ] **pomodoroProjectId 硬编码**：`App.tsx` 中 `useState('research-topic-a')` 是旧种子数据的 ID，新用户首次启动时番茄钟关联不到有效项目
- [ ] **useScheduleActions 跨实体失败处理**：`convertDiaryToTask` 没有 `createTaskBlock` 那样的回滚机制
- [ ] **当前时间 vs selectedDate**：确保 Planner now 线等当前时间指示器用真实今天，不用 selectedDate

## P1：日程与完成流程

- [ ] **PomodoroSession 作为 Planner done block 渲染**：已完成的番茄钟应显示在 Planner 时间线上（只读 done 层）
- [ ] **Daily view 已完成汇总**：按项目汇总已完成番茄钟 + 具体完成时段列表
- [ ] **seedState 首屏闪烁**：`loadState()` 无 localStorage 时返回 `seedState()`（空数组），但 entity hooks mount 前可能有短暂的空状态渲染
- [ ] **秒表完成记录**：决定秒表完成的记录是否也成为 done block

## P2：研究/事务/指导记录分层

- [ ] **ResearchLogKind 迁移**：代码已限制为 `literature`/`writing`/`experiment`，需安全迁移旧 `analysis`/`meeting`/`admin` 数据
- [ ] **logType 分层**：为 research/admin/student 记录类型确定最终方案
- [ ] **ResearchLogPage 旧 kind 兼容**：编辑旧记录时如果 kind 不在新枚举内，如何处理

## P3：布局

- [ ] **侧栏响应式行为**：宽屏 docked → 中屏 rail → 窄屏展开时 overlay drawer
- [ ] **右侧 ToolPanel 行为**：中/窄屏改为 overlay drawer，不挤压 workspace
- [ ] **Planner 弹窗定位**：ToolPanel 打开时 popover 不超出 workspace 区域

## P4：测试

- [ ] **@testing-library/react 安装**：当前只有 vitest 纯函数测试（36 个），无组件/集成测试
- [ ] **DailyPage 集成测试**：selectedDate 日视图、diary/task 双模式创建/编辑/删除
- [ ] **useScheduleActions 测试**：跨实体 block 创建/转换/删除联动
- [ ] **PomodoroSession done block 测试**：验证渲染和汇总逻辑
- [ ] **diary vs task ScheduleBlock 测试**：类型转换、项目关联、独立删除行为

## Later（用户明确要求时再做）

- [ ] 可选的本地附件文件管理（目前只存文件名字符串）
- [ ] 点击打开本地文件（浏览器安全限制）
- [ ] 应用内 JSON 备份导入导出
- [ ] Zotero 集成 / DOI 自动补全 / PDF 元数据提取

## Done（2026-05-11 文档同步确认）

- [x] 前后端类型共享（`shared/types.ts` 单一数据源）
- [x] 清理 lint errors（零错误）
- [x] 删除 block 清理孤立 Task（通过 `useScheduleActions.deleteBlock`）
- [x] 研究日记 / 文献记录支持编辑
- [x] 番茄钟记录支持修正（编辑/删除）
- [x] 项目详情"查看更多"
- [x] 文献记录结构化字段（readingStatus / keyFindings / nextAction）
- [x] 项目管理筛选器持久化（localStorage）
- [x] 已归档项目展示（侧栏折叠）
- [x] 全局搜索（跨项目/日记/文献/附件）
- [x] 单项目 Markdown 导出
- [x] ScheduleBlock diary/task 双模式（useScheduleActions 跨实体层）
- [x] 番茄钟计时逻辑从 App.tsx 下沉到 PomodoroTimerProvider
- [x] seedState 返回空数组（无 demo 数据）
- [x] Project.kind 统一为 research / admin
- [x] TodayPage 重命名为 DailyPage（路由仍为 `/today`）
- [x] ResearchLogKind 限制为 literature / writing / experiment
- [x] 文档四件套同步（README / CLAUDE.md / AGENTS.md / TODO.md）
- [x] ToolPanel 日历仅调 setDate 不导航
- [x] 侧栏 "今天" 改为 selectedDate 快捷操作
