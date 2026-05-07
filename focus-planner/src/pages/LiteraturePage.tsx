import { useMemo, useState } from 'react'
import { FileText, Paperclip, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { uid, isWebLink, getFallbackProjectId } from '../utils'
import { defaultProjects } from '../constants'

export function LiteraturePage() {
  const { state, researchLogs, date, setDate, projectFilterId, setProjectFilterId } = useApp()

  const [newLogTitle, setNewLogTitle] = useState('')
  const [newLogSource, setNewLogSource] = useState('')
  const [newLogNote, setNewLogNote] = useState('')
  const [newLogAttachment, setNewLogAttachment] = useState('')

  const projectsById = useMemo(
    () => Object.fromEntries(state.projects.map(project => [project.id, project])),
    [state.projects],
  )

  const visibleResearchLogs = useMemo(
    () => state.researchLogs
      .filter(entry => projectFilterId === 'all' || entry.projectId === projectFilterId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [state.researchLogs, projectFilterId],
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
      projectId: projectFilterId === 'all' ? getFallbackProjectId(state.projects, defaultProjects[0].id) : projectFilterId,
      kind: 'literature' as const,
      title: title || '文献', source, note,
      attachments: attachmentText ? attachmentText.split(/\n|,/).map(item => item.trim()).filter(Boolean) : [],
      createdAt: new Date().toISOString(),
    }

    researchLogs.create(entry).catch(() => {})
    setNewLogTitle(''); setNewLogSource(''); setNewLogNote(''); setNewLogAttachment('')
  }

  const deleteResearchLog = (id: string) => {
    researchLogs.delete(id).catch(() => {})
  }

  return (
    <div className="literature-page">
      <div className="diary-toolbar">
        <div>
          <strong>{projectFilterId === 'all' ? '全部文献' : projectsById[projectFilterId]?.name}</strong>
          <span>{visibleLiteratureLogs.length} 条文献记录</span>
        </div>
        <select value={projectFilterId} onChange={event => setProjectFilterId(event.target.value)} aria-label="筛选项目">
          <option value="all">全部项目</option>
          {state.projects.map(project => (<option key={project.id} value={project.id}>{project.name}</option>))}
        </select>
      </div>

      <section className="diary-composer">
        <div className="diary-composer-row">
          <input type="date" value={date} onChange={event => setDate(event.target.value)} />
          <select
            value={projectFilterId === 'all' ? getFallbackProjectId(state.projects, defaultProjects[0].id) : projectFilterId}
            onChange={event => setProjectFilterId(event.target.value)}
            aria-label="关联项目"
          >
            {state.projects.map(project => (<option key={project.id} value={project.id}>{project.name}</option>))}
          </select>
        </div>
        <input value={newLogTitle} onChange={event => setNewLogTitle(event.target.value)} placeholder="文献标题" />
        <input value={newLogSource} onChange={event => setNewLogSource(event.target.value)} placeholder="DOI / Zotero key / arXiv / 论文链接 / PDF 路径" />
        <textarea value={newLogNote} onChange={event => setNewLogNote(event.target.value)} placeholder="研究问题、方法、结果、可引用观点、和你的下一步" />
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
            return (
              <article key={entry.id} className="literature-entry">
                <div className="literature-entry-head">
                  <FileText size={18} />
                  <div>
                    <strong>{entry.title}</strong>
                    <span>{project?.name ?? '工作项目'} · {entry.date}</span>
                  </div>
                  <button type="button" onClick={() => deleteResearchLog(entry.id)} aria-label="删除文献记录"><Trash2 size={15} /></button>
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
          <div className="diary-empty">还没有文献记录</div>
        )}
      </div>
    </div>
  )
}
