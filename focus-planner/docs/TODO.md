# Focus Planner — 待办事项

基于 2026-05-07 代码审计。已归档的历史条目见 git log。

---

## P0：技术债 & 安全

- [ ] **前后端类型共享**：`server/types.ts` 与 `src/types.ts` 是两份独立拷贝，核心类型（Project/Task/ScheduleBlock 等）目前一致但随时可能漂移。应提取为 `shared/types.ts` 双端引用
- [ ] **清理 8 个 lint error**：
  - `App.tsx:7` — `seedState` 导入未使用
  - `ToolPanel.tsx:27` — `isToolPanelOpen` 赋值未使用
  - `ProjectsPage.tsx:4` — `getFallbackProjectId` 导入未使用
  - `useAppContext.tsx:48` — 导出非组件常量触发 react-refresh 警告
  - `PlannerPage.tsx:41,49` — React Compiler 无法保留手动 useMemo（考虑移除或改为 React Compiler 友好写法）
  - `server/db.ts:239`、`server/routes/backups.ts:24` — 空 catch 块需加注释
- [ ] **删除时间块不清理孤立 Task**：`PlannerPage.removeBlock` 只删 ScheduleBlock，对应的 `source:'schedule'` 空壳 Task 永远留在 state.tasks 中（类似内存泄漏）

## P1：核心体验缺失（目前只能新增/删除，不能编辑）

- [x] **研究日记支持编辑**：DiaryPage 只有 addResearchLog + deleteResearchLog，已有条目只读，无法修改内容
- [x] **文献记录支持编辑**：LiteraturePage 同上
- [x] **番茄钟记录支持修正**：PomodoroSession 创建后无法编辑（改项目/时长）或删除；前端无管理 UI，后端 DELETE 路由已存在但前端未接入
- [x] **项目详情"查看更多"**：ProjectsPage 文献列表硬切 `.slice(0, 5)`、附件 `.slice(0, 10)`，无展开按钮

## P2：体验优化

- [x] **文献记录结构化字段**：ResearchLogEntry 只有 `title/source/note/attachments`，缺少阅读状态、关键结论、下一步行动等科研常用字段
- [x] **项目管理筛选器持久化**：type/status 筛选器是 `useState('all')`，刷新即丢失，应存 localStorage
- [ ] **毕业论文指导增强**：ThesisStudent 基础 CRUD 已有，缺少进度筛选、逾期高亮、关联任务
- [ ] **任务树拖拽排序**：当前拖拽仅用于 TodayPage→PlannerPage 排期，无 reorder/reparent 能力
- [ ] **自定义项目模板**：`projectTaskTemplates` 硬编码在 constants.ts，用户无法自定义
- [x] **已归档项目展示**：status='archived' 存在但侧栏和非项目视图无入口，归档后"消失"

## P3：搜索与导出

- [x] **全局搜索**：跨项目/日记/文献/附件索引（后端 `search.ts` 已有基础 LIKE 查询，前端无搜索 UI）
- [ ] **搜索结果筛选**：按类型、项目、日期范围
- [ ] **附件索引页**：跨项目汇总所有已记录附件
- [x] **单项目 Markdown 导出**：SummaryPage 目前只做单日总结，无全项目导出（任务树 + 日记 + 文献 + 附件）

## P4：基础设施

- [ ] **安装 @testing-library/react**：当前只有 vitest 纯函数测试（36 个），无组件/集成测试
- [ ] **组件测试**：覆盖 PlannerPage（日程块创建/编辑/删除/转化）、TodayPage（任务拖拽排期）等关键交互

## Later（用户明确要求时再做）

- [ ] 可选的本地附件文件管理（目前只存文件名字符串）
- [ ] 点击打开本地文件（浏览器安全限制）
- [ ] 应用内 JSON 备份导入导出
- [ ] Zotero 集成 / DOI 自动补全 / PDF 元数据提取
