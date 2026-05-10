# Focus Planner — 待办事项

基于 2026-05-10 文档同步后的当前状态。

---

## P0：当前已知问题

- [ ] **seedState 首屏闪烁**：`loadState()` 无 localStorage 时返回 `seedState()`（空数组），但 entity hooks mount 前可能有短暂的空状态渲染
- [ ] **pomodoroProjectId 硬编码**：`App.tsx` 中 `useState('research-topic-a')` 是旧种子数据的 ID，新用户首次启动时番茄钟关联不到有效项目
- [ ] **useScheduleActions 跨实体失败处理**：`createTaskBlock` 中 Task 创建成功但 Block 创建失败时回滚 Task，但 `convertDiaryToTask` 没有类似回滚

## P1：体验优化

- [ ] **毕业论文指导增强**：ThesisStudent 基础 CRUD 已有，缺少进度筛选、逾期高亮、关联任务
- [ ] **任务树拖拽排序**：当前拖拽仅用于 TodayPage→PlannerPage 排期，无 reorder/reparent 能力
- [ ] **自定义项目模板**：`projectTaskTemplates` 硬编码在 constants.ts，用户无法自定义
- [ ] **PomodoroSession 在 SummaryPage 展示**：日总结的 Markdown 目前不统计 pomodoroSessions，项目报告才统计专注时长
- [ ] **PomodoroSession 在 Planner 时间线渲染**：已完成的番茄钟不显示为 Planner 时间线上的 done block
- [ ] **页面内计时提醒**：`PomodoroTimerProvider` 已有 Notification API + 音频提醒，但页面内无 visual alert（只在 ToolPanel 里有 timer alert）

## P2：搜索与导出

- [ ] **搜索结果筛选**：按类型、项目、日期范围
- [ ] **附件索引页**：跨项目汇总所有已记录附件

## P3：基础设施

- [ ] **安装 @testing-library/react**：当前只有 vitest 纯函数测试（36 个），无组件/集成测试
- [ ] **组件测试**：覆盖 PlannerPage（block 创建/编辑/删除/转换）、TodayPage（diary/task 双模式）等关键交互

## Later（用户明确要求时再做）

- [ ] 可选的本地附件文件管理（目前只存文件名字符串）
- [ ] 点击打开本地文件（浏览器安全限制）
- [ ] 应用内 JSON 备份导入导出
- [ ] Zotero 集成 / DOI 自动补全 / PDF 元数据提取

## Done（2026-05-10 文档同步确认）

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
