import { useMemo, useState } from 'react'
import { Check, Paperclip, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { toDateKey, getWeekDays, uid, researchLogKindLabels, isWebLink, getFallbackProjectId } from '../utils'
import { defaultProjects } from '../constants'
import type { ResearchLogKind, ReadingStatus } from '../../shared/types'

export function DiaryPage() {
  const { researchLogs, projects, date, setDate, projectFilterId, setProjectFilterId } = useApp()

  const [newLogKind, setNewLogKind] = useState<ResearchLogKind>('literature')
  const [newLogTitle, setNewLogTitle] = useState('')
  const [newLogSource, setNewLogSource] = useState('')
  const [newLogNote, setNewLogNote] = useState('')
  const [newLogAttachment, setNewLogAttachment] = useState('')
  const [newLogReadingStatus, setNewLogReadingStatus] = useState<ReadingStatus>('unread')
  const [newLogKeyFindings, setNewLogKeyFindings] = useState('')
  const [newLogNextAction, setNewLogNextAction] = useState('')

  // Edit state
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSource, setEditSource] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editAttachments, setEditAttachments] = useState('')
  const [editReadingStatus, setEditReadingStatus] = useState<ReadingStatus>('unread')
  const [editKeyFindings, setEditKeyFindings] = useState('')
  const [editNextAction, setEditNextAction] = useState('')

  const weekDays = getWeekDays(date)
  const weekKeys = weekDays.map(toDateKey)

  const projectsById = useMemo(
    () => Object.fromEntries(projects.items.map(project => [project.id, project])),
    [projects.items],
  )

  const selectedDayLogs = useMemo(
    () => researchLogs.items
      .filter(entry => entry.date === date)
      .filter(entry => projectFilterId === 'all' || entry.projectId === projectFilterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [researchLogs.items, date, projectFilterId],
  )

  const weekLogs = useMemo(
    () => researchLogs.items.filter(
      entry => weekKeys.includes(entry.date) && (projectFilterId === 'all' || entry.projectId === projectFilterId),
    ),
    [researchLogs.items, weekKeys, projectFilterId],
  )

  const addResearchLog = () => {
    const title = newLogTitle.trim()
    const note = newLogNote.trim()
    const source = newLogSource.trim()
    const attachmentText = newLogAttachment.trim()
    if (!title && !note && !source && !attachmentText) return

    const entry = {
      id: uid(),
      date,
      projectId: projectFilterId === 'all' ? getFallbackProjectId(projects.items, defaultProjects[0].id) : projectFilterId,
      kind: newLogKind,
      title: title || researchLogKindLabels[newLogKind],
      source,
      note,
      attachments: attachmentText ? attachmentText.split(/\n|,/).map(item => item.trim()).filter(Boolean) : [],
      createdAt: new Date().toISOString(),
      readingStatus: newLogReadingStatus,
      keyFindings: newLogKeyFindings.trim(),
      nextAction: newLogNextAction.trim(),
    }

    researchLogs.create(entry).catch(() => {})
    setNewLogTitle('')
    setNewLogSource('')
    setNewLogNote('')
    setNewLogAttachment('')
    setNewLogReadingStatus('unread')
    setNewLogKeyFindings('')
    setNewLogNextAction('')
  }

  const deleteResearchLog = (id: string) => {
    researchLogs.remove(id).catch(() => {})
    if (editingLogId === id) setEditingLogId(null)
  }

  const startEdit = (entry: typeof selectedDayLogs[0]) => {
    setEditingLogId(entry.id)
    setEditTitle(entry.title)
    setEditSource(entry.source)
    setEditNote(entry.note)
    setEditAttachments(entry.attachments.join(', '))
    setEditReadingStatus(entry.readingStatus)
    setEditKeyFindings(entry.keyFindings)
    setEditNextAction(entry.nextAction)
  }

  const saveEdit = () => {
    if (!editingLogId) return
    const attachmentText = editAttachments.trim()
    researchLogs.update(editingLogId, {
      title: editTitle.trim() || researchLogKindLabels.literature,
      source: editSource.trim(),
      note: editNote.trim(),
      attachments: attachmentText ? attachmentText.split(/\n|,/).map(item => item.trim()).filter(Boolean) : [],
      readingStatus: editReadingStatus,
      keyFindings: editKeyFindings.trim(),
      nextAction: editNextAction.trim(),
    }).catch(() => {})
    setEditingLogId(null)
  }

  const cancelEdit = () => {
    setEditingLogId(null)
  }

  return (
    <div className="diary-page">
      <div className="diary-toolbar">
        <div>
          <strong>{date}</strong>
          <span>本周 {weekLogs.length} 条记录</span>
        </div>
        <label className="diary-date-label">日期
          <input type="date" value={date} onChange={event => setDate(event.target.value)} />
        </label>
      </div>

      <section className="diary-composer">
        <div className="diary-composer-row">
          <select
            value={projectFilterId === 'all' ? getFallbackProjectId(projects.items, defaultProjects[0].id) : projectFilterId}
            onChange={event => setProjectFilterId(event.target.value)}
            aria-label="关联项目"
          >
            {projects.items.map(project => (<option key={project.id} value={project.id}>{project.name}</option>))}
          </select>
          <select value={newLogKind} onChange={event => setNewLogKind(event.target.value as ResearchLogKind)} aria-label="记录类型">
            <option value="literature">文献</option><option value="experiment">实验</option><option value="analysis">分析</option>
            <option value="writing">写作</option><option value="meeting">讨论</option><option value="admin">事务</option>
          </select>
        </div>
        <input value={newLogTitle} onChange={event => setNewLogTitle(event.target.value)} placeholder="今天做了什么：读了哪篇文献 / 跑了哪个分析 / 修改了哪一节" />
        <input value={newLogSource} onChange={event => setNewLogSource(event.target.value)} placeholder="文献 DOI、Zotero key、论文链接、数据路径或会议链接" />
        <textarea value={newLogNote} onChange={event => setNewLogNote(event.target.value)} placeholder="关键结论、下一步、疑问、可复用的方法或需要回看的细节" />
        <div className="diary-composer-row">
          <label>阅读状态
            <select value={newLogReadingStatus} onChange={e => setNewLogReadingStatus(e.target.value as ReadingStatus)} aria-label="阅读状态">
              <option value="unread">未读</option><option value="reading">阅读中</option><option value="read">已读</option><option value="reviewed">已复盘</option>
            </select>
          </label>
        </div>
        <textarea value={newLogKeyFindings} onChange={event => setNewLogKeyFindings(event.target.value)} placeholder="核心发现 / 关键结论（可选）" className="diary-edit-textarea compact" />
        <input value={newLogNextAction} onChange={event => setNewLogNextAction(event.target.value)} placeholder="下一步行动（可选）" />
        <div className="attachment-row">
          <input value={newLogAttachment} onChange={event => setNewLogAttachment(event.target.value)} placeholder="附件名/路径/链接，多个用逗号或换行分隔" />
          <label className="file-attach">
            <Paperclip size={16} />
            选文件名
            <input
              type="file"
              multiple
              onChange={event => {
                const names = Array.from(event.target.files ?? []).map(file => file.name)
                if (names.length) setNewLogAttachment(prev => [prev, ...names].filter(Boolean).join(prev ? ', ' : ''))
                event.currentTarget.value = ''
              }}
            />
          </label>
          <button type="button" onClick={addResearchLog}>
            <Plus size={17} />
            记录
          </button>
        </div>
      </section>

      <div className="diary-list">
        {selectedDayLogs.length ? (
          selectedDayLogs.map(entry => {
            const project = projectsById[entry.projectId]
            const isEditing = editingLogId === entry.id
            return (
              <article key={entry.id} className={`diary-entry ${isEditing ? 'editing' : ''}`}>
                {isEditing ? (
                  <>
                    <div className="diary-entry-head">
                      <span className={`kind-pill ${project?.kind ?? 'research'}`}>{researchLogKindLabels[entry.kind]}</span>
                      <strong>编辑记录</strong>
                      <div className="diary-edit-actions">
                        <button type="button" onClick={saveEdit} aria-label="保存修改" className="save-btn">
                          <Check size={15} />
                        </button>
                        <button type="button" onClick={cancelEdit} aria-label="取消修改" className="cancel-btn">
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                    <input className="diary-edit-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="标题" />
                    <input className="diary-edit-input" value={editSource} onChange={e => setEditSource(e.target.value)} placeholder="DOI / 链接 / 来源" />
                    <textarea className="diary-edit-textarea" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="关键结论、下一步、疑问..." />
                    <label>阅读状态
                      <select value={editReadingStatus} onChange={e => setEditReadingStatus(e.target.value as ReadingStatus)} aria-label="阅读状态">
                        <option value="unread">未读</option><option value="reading">阅读中</option><option value="read">已读</option><option value="reviewed">已复盘</option>
                      </select>
                    </label>
                    <textarea className="diary-edit-textarea compact" value={editKeyFindings} onChange={e => setEditKeyFindings(e.target.value)} placeholder="核心发现 / 关键结论" />
                    <input className="diary-edit-input" value={editNextAction} onChange={e => setEditNextAction(e.target.value)} placeholder="下一步行动" />
                    <input className="diary-edit-input" value={editAttachments} onChange={e => setEditAttachments(e.target.value)} placeholder="附件，多个用逗号分隔" />
                  </>
                ) : (
                  <>
                    <div className="diary-entry-head">
                      <span className={`kind-pill ${project?.kind ?? 'research'}`}>{researchLogKindLabels[entry.kind]}</span>
                      <strong>{entry.title}</strong>
                      <em>{project?.name ?? '工作项目'}</em>
                      <div className="diary-entry-actions">
                        <button type="button" onClick={() => startEdit(entry)} aria-label="编辑研究日记">
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => deleteResearchLog(entry.id)} aria-label="删除研究日记">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    {entry.source && <p className="diary-source">{entry.source}</p>}
                    <div className="diary-status-row">
                      <span className={`reading-status ${entry.readingStatus}`}>
                        {entry.readingStatus === 'unread' ? '未读' : entry.readingStatus === 'reading' ? '阅读中' : entry.readingStatus === 'read' ? '已读' : '已复盘'}
                      </span>
                    </div>
                    {entry.note && <p className="diary-note">{entry.note}</p>}
                    {entry.keyFindings && <p className="diary-findings"><strong>关键结论：</strong>{entry.keyFindings}</p>}
                    {entry.nextAction && <p className="diary-next-action"><strong>下一步：</strong>{entry.nextAction}</p>}
                    {entry.attachments.length > 0 && (
                      <div className="diary-attachments">
                        {entry.attachments.map(attachment => (
                          isWebLink(attachment) ? (
                            <a key={attachment} href={attachment} target="_blank" rel="noreferrer"><Paperclip size={13} />{attachment}</a>
                          ) : (
                            <span key={attachment}><Paperclip size={13} />{attachment}</span>
                          )
                        ))}
                      </div>
                    )}
                  </>
                )}
              </article>
            )
          })
        ) : (
          <div className="diary-empty">今天还没有研究记录</div>
        )}
      </div>
    </div>
  )
}
