import { useMemo, useState } from 'react'
import { Paperclip, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { toDateKey, getWeekDays, uid, researchLogKindLabels, isWebLink, getFallbackProjectId } from '../utils'
import { defaultProjects } from '../constants'
import type { ResearchLogKind } from '../../shared/types'

export function DiaryPage() {
  const { researchLogs, projects, date, setDate, projectFilterId, setProjectFilterId } = useApp()

  const [newLogKind, setNewLogKind] = useState<ResearchLogKind>('literature')
  const [newLogTitle, setNewLogTitle] = useState('')
  const [newLogSource, setNewLogSource] = useState('')
  const [newLogNote, setNewLogNote] = useState('')
  const [newLogAttachment, setNewLogAttachment] = useState('')

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
    }

    researchLogs.create(entry).catch(() => {})
    setNewLogTitle('')
    setNewLogSource('')
    setNewLogNote('')
    setNewLogAttachment('')
  }

  const deleteResearchLog = (id: string) => {
    researchLogs.remove(id).catch(() => {})
  }

  return (
    <div className="diary-page">
      <div className="diary-toolbar">
        <div>
          <strong>{date}</strong>
          <span>本周 {weekLogs.length} 条记录</span>
        </div>
        <input type="date" value={date} onChange={event => setDate(event.target.value)} />
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
            return (
              <article key={entry.id} className="diary-entry">
                <div className="diary-entry-head">
                  <span className={`kind-pill ${project?.kind ?? 'research'}`}>{researchLogKindLabels[entry.kind]}</span>
                  <strong>{entry.title}</strong>
                  <em>{project?.name ?? '工作项目'}</em>
                  <button type="button" onClick={() => deleteResearchLog(entry.id)} aria-label="删除研究日记"><Trash2 size={15} /></button>
                </div>
                {entry.source && <p className="diary-source">{entry.source}</p>}
                {entry.note && <p className="diary-note">{entry.note}</p>}
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
