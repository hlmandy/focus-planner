import { useMemo, useState } from 'react'
import { Check, ChevronDown, Paperclip, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { uid, researchLogKindLabels, isWebLink, getFallbackProjectId } from '../utils'
import { defaultProjects } from '../constants'
import type { ResearchLogKind, ReadingStatus } from '../../shared/types'

const kindOptions: { value: ResearchLogKind | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'literature', label: '文献' },
  { value: 'experiment', label: '实验' },
  { value: 'analysis', label: '分析' },
  { value: 'writing', label: '写作' },
  { value: 'meeting', label: '讨论' },
  { value: 'admin', label: '事务' },
]

export function ResearchLogPage() {
  const { researchLogs, projects, date, setDate, projectFilterId, setProjectFilterId } = useApp()

  const [quickText, setQuickText] = useState('')
  const [quickKind, setQuickKind] = useState<ResearchLogKind>('literature')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSource, setEditSource] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editAttachments, setEditAttachments] = useState('')
  const [editReadingStatus, setEditReadingStatus] = useState<ReadingStatus>('unread')
  const [editKeyFindings, setEditKeyFindings] = useState('')
  const [editNextAction, setEditNextAction] = useState('')

  const [kindFilter, setKindFilter] = useState<ResearchLogKind | 'all'>('all')

  const projectsById = useMemo(
    () => Object.fromEntries(projects.items.map(project => [project.id, project])),
    [projects.items],
  )

  const visibleLogs = useMemo(
    () => researchLogs.items
      .filter(entry => (kindFilter === 'all' || entry.kind === kindFilter))
      .filter(entry => projectFilterId === 'all' || entry.projectId === projectFilterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [researchLogs.items, kindFilter, projectFilterId],
  )

  const addQuickLog = () => {
    const text = quickText.trim()
    if (!text) return
    const firstNewline = text.indexOf('\n')
    let title = ''
    let note = ''
    if (firstNewline > 0) {
      title = text.slice(0, firstNewline).trim()
      note = text.slice(firstNewline + 1).trim()
    } else if (text.length <= 60) {
      title = text
    } else {
      note = text
    }
    const entry = {
      id: uid(),
      date,
      projectId: projectFilterId === 'all' ? getFallbackProjectId(projects.items, defaultProjects[0].id) : projectFilterId,
      kind: quickKind,
      title: title || researchLogKindLabels[quickKind],
      source: '',
      note,
      attachments: [],
      createdAt: new Date().toISOString(),
      readingStatus: 'unread' as const,
      keyFindings: '',
      nextAction: '',
    }
    researchLogs.create(entry).catch(() => {})
    setQuickText('')
  }

  const deleteResearchLog = (id: string) => {
    researchLogs.remove(id).catch(() => {})
    if (editingLogId === id) setEditingLogId(null)
    if (expandedId === id) setExpandedId(null)
  }

  const startEdit = (entry: typeof visibleLogs[0]) => {
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

  const toggleExpand = (id: string) => {
    if (editingLogId === id) return
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div className="research-log-page">
      <div className="log-toolbar">
        <div>
          <strong>研究日志</strong>
          <span>{visibleLogs.length} 条记录</span>
        </div>
        <label className="log-date-label">日期
          <input type="date" value={date} onChange={event => setDate(event.target.value)} />
        </label>
        <select value={projectFilterId} onChange={event => setProjectFilterId(event.target.value)} aria-label="筛选项目">
          <option value="all">全部项目</option>
          {projects.items.map(project => (<option key={project.id} value={project.id}>{project.name}</option>))}
        </select>
        <select value={kindFilter} onChange={event => setKindFilter(event.target.value as ResearchLogKind | 'all')} aria-label="筛选类型">
          {kindOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
        </select>
      </div>

      <div className="quick-capture">
        <div className="quick-capture-row">
          <input
            value={quickText}
            onChange={event => setQuickText(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); addQuickLog() } }}
            placeholder="记一笔想法、文献、发现… Enter 保存，Shift+Enter 换行"
            className="quick-capture-input"
          />
          <select value={quickKind} onChange={event => setQuickKind(event.target.value as ResearchLogKind)} className="quick-capture-kind">
            {kindOptions.filter(opt => opt.value !== 'all').map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
          <button type="button" onClick={addQuickLog} className="quick-capture-btn"><Plus size={17} /></button>
        </div>
      </div>

      <div className="log-list">
        {visibleLogs.length ? (
          visibleLogs.map(entry => {
            const project = projectsById[entry.projectId]
            const isExpanded = expandedId === entry.id
            const isEditing = editingLogId === entry.id
            return (
              <article key={entry.id} className={`log-entry ${isExpanded ? 'expanded' : ''} ${isEditing ? 'editing' : ''}`}>
                {isEditing ? (
                  <>
                    <div className="log-entry-head">
                      <span className={`kind-pill ${entry.kind}`}>{researchLogKindLabels[entry.kind]}</span>
                      <strong>编辑记录</strong>
                      <div className="log-edit-actions">
                        <button type="button" onClick={saveEdit} aria-label="保存修改" className="save-btn"><Check size={15} /></button>
                        <button type="button" onClick={cancelEdit} aria-label="取消修改" className="cancel-btn"><X size={15} /></button>
                      </div>
                    </div>
                    <input className="log-edit-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="标题" />
                    <input className="log-edit-input" value={editSource} onChange={e => setEditSource(e.target.value)} placeholder="DOI / 链接 / 来源" />
                    <textarea className="log-edit-textarea" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="笔记…" />
                    <label>阅读状态
                      <select value={editReadingStatus} onChange={e => setEditReadingStatus(e.target.value as ReadingStatus)} aria-label="阅读状态">
                        <option value="unread">未读</option><option value="reading">阅读中</option><option value="read">已读</option><option value="reviewed">已复盘</option>
                      </select>
                    </label>
                    <textarea className="log-edit-textarea compact" value={editKeyFindings} onChange={e => setEditKeyFindings(e.target.value)} placeholder="核心发现 / 关键结论" />
                    <input className="log-edit-input" value={editNextAction} onChange={e => setEditNextAction(e.target.value)} placeholder="下一步行动" />
                    <input className="log-edit-input" value={editAttachments} onChange={e => setEditAttachments(e.target.value)} placeholder="附件，多个用逗号分隔" />
                  </>
                ) : (
                  <>
                    <div className="log-entry-summary" onClick={() => toggleExpand(entry.id)}>
                      <span className={`kind-pill ${entry.kind}`}>{researchLogKindLabels[entry.kind]}</span>
                      <strong>{entry.title}</strong>
                      <span className="log-entry-meta">{project?.name} · {entry.date}</span>
                      <ChevronDown size={15} className={`log-expand-icon ${isExpanded ? 'open' : ''}`} />
                      <div className="log-entry-actions" onClick={e => e.stopPropagation()}>
                        <button type="button" onClick={() => startEdit(entry)} aria-label="编辑"><Pencil size={14} /></button>
                        <button type="button" onClick={() => deleteResearchLog(entry.id)} aria-label="删除"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="log-entry-detail">
                        {entry.source && <p className="log-source">{entry.source}</p>}
                        <div className="log-status-row">
                          <span className={`reading-status ${entry.readingStatus}`}>
                            {entry.readingStatus === 'unread' ? '未读' : entry.readingStatus === 'reading' ? '阅读中' : entry.readingStatus === 'read' ? '已读' : '已复盘'}
                          </span>
                        </div>
                        {entry.note && <p className="log-note">{entry.note}</p>}
                        {entry.keyFindings && <p className="log-findings"><strong>关键结论：</strong>{entry.keyFindings}</p>}
                        {entry.nextAction && <p className="log-next-action"><strong>下一步：</strong>{entry.nextAction}</p>}
                        {entry.attachments.length > 0 && (
                          <div className="log-attachments">
                            {entry.attachments.map(attachment => (
                              isWebLink(attachment) ? (
                                <a key={attachment} href={attachment} target="_blank" rel="noreferrer"><Paperclip size={13} />{attachment}</a>
                              ) : (
                                <span key={attachment}><Paperclip size={13} />{attachment}</span>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </article>
            )
          })
        ) : (
          <div className="log-empty">还没有研究记录，记一笔吧</div>
        )}
      </div>
    </div>
  )
}
