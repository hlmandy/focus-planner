import { useMemo, useState } from 'react'
import { Check, FileText, Paperclip, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { uid, isWebLink, getFallbackProjectId } from '../utils'
import { defaultProjects } from '../constants'
import type { ReadingStatus } from '../../shared/types'

export function LiteraturePage() {
  const { researchLogs, projects, date, setDate, projectFilterId, setProjectFilterId } = useApp()

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

  const projectsById = useMemo(
    () => Object.fromEntries(projects.items.map(project => [project.id, project])),
    [projects.items],
  )

  const visibleResearchLogs = useMemo(
    () => researchLogs.items
      .filter(entry => projectFilterId === 'all' || entry.projectId === projectFilterId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [researchLogs.items, projectFilterId],
  )

  const visibleLiteratureLogs = visibleResearchLogs.filter(entry => entry.kind === 'literature')

  const addResearchLog = () => {
    const title = newLogTitle.trim()
    const note = newLogNote.trim()
    const source = newLogSource.trim()
    const attachmentText = newLogAttachment.trim()
    if (!title && !note && !source && !attachmentText) return

    const entry = {
      id: uid(), date,
      projectId: projectFilterId === 'all' ? getFallbackProjectId(projects.items, defaultProjects[0].id) : projectFilterId,
      kind: 'literature' as const,
      title: title || '文献', source, note,
      attachments: attachmentText ? attachmentText.split(/\n|,/).map(item => item.trim()).filter(Boolean) : [],
      createdAt: new Date().toISOString(),
      readingStatus: newLogReadingStatus,
      keyFindings: newLogKeyFindings.trim(),
      nextAction: newLogNextAction.trim(),
    }

    researchLogs.create(entry).catch(() => {})
    setNewLogTitle(''); setNewLogSource(''); setNewLogNote(''); setNewLogAttachment('')
    setNewLogReadingStatus('unread'); setNewLogKeyFindings(''); setNewLogNextAction('')
  }

  const deleteResearchLog = (id: string) => {
    researchLogs.remove(id).catch(() => {})
    if (editingLogId === id) setEditingLogId(null)
  }

  const startEdit = (entry: typeof visibleLiteratureLogs[0]) => {
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
      title: editTitle.trim() || '文献',
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
    <div className="literature-page">
      <div className="diary-toolbar">
        <div>
          <strong>{projectFilterId === 'all' ? '全部文献' : projectsById[projectFilterId]?.name}</strong>
          <span>{visibleLiteratureLogs.length} 条文献记录</span>
        </div>
        <label className="diary-date-label">日期
          <input type="date" value={date} onChange={event => setDate(event.target.value)} />
        </label>
        <select value={projectFilterId} onChange={event => setProjectFilterId(event.target.value)} aria-label="筛选项目">
          <option value="all">全部项目</option>
          {projects.items.map(project => (<option key={project.id} value={project.id}>{project.name}</option>))}
        </select>
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
        </div>
        <input value={newLogTitle} onChange={event => setNewLogTitle(event.target.value)} placeholder="文献标题" />
        <input value={newLogSource} onChange={event => setNewLogSource(event.target.value)} placeholder="DOI / Zotero key / arXiv / 论文链接 / PDF 路径" />
        <textarea value={newLogNote} onChange={event => setNewLogNote(event.target.value)} placeholder="研究问题、方法、结果、可引用观点、和你的下一步" />
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
          <input value={newLogAttachment} onChange={event => setNewLogAttachment(event.target.value)} placeholder="PDF、笔记、截图、数据文件，多个用逗号或换行分隔" />
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
            加入文献
          </button>
        </div>
      </section>

      <div className="literature-list">
        {visibleLiteratureLogs.length ? (
          visibleLiteratureLogs.map(entry => {
            const project = projectsById[entry.projectId]
            const isEditing = editingLogId === entry.id
            return (
              <article key={entry.id} className={`literature-entry ${isEditing ? 'editing' : ''}`}>
                {isEditing ? (
                  <>
                    <div className="diary-entry-head">
                      <FileText size={18} />
                      <div>
                        <strong>编辑文献</strong>
                        <span>{project?.name ?? '工作项目'} · {entry.date}</span>
                      </div>
                      <div className="diary-edit-actions">
                        <button type="button" onClick={saveEdit} aria-label="保存修改" className="save-btn">
                          <Check size={15} />
                        </button>
                        <button type="button" onClick={cancelEdit} aria-label="取消修改" className="cancel-btn">
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                    <input className="diary-edit-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="文献标题" />
                    <input className="diary-edit-input" value={editSource} onChange={e => setEditSource(e.target.value)} placeholder="DOI / 链接 / 来源" />
                    <textarea className="diary-edit-textarea" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="研究问题、方法、结果..." />
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
                    <div className="literature-entry-head">
                      <FileText size={18} />
                      <div>
                        <strong>{entry.title}</strong>
                        <span>{project?.name ?? '工作项目'} · {entry.date}</span>
                      </div>
                      <div className="diary-entry-actions">
                        <button type="button" onClick={() => startEdit(entry)} aria-label="编辑文献记录">
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => deleteResearchLog(entry.id)} aria-label="删除文献记录">
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
          <div className="diary-empty">还没有文献记录</div>
        )}
      </div>
    </div>
  )
}
