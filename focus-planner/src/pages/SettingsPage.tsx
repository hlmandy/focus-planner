import { RotateCcw } from 'lucide-react'
import { api, reportApiError } from '../api/client'
import { useApp } from '../hooks/useAppContext'
import { seedState } from '../seed'
import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { settingsApi } from '../api/settings'
import type { AppState, PageName } from '../../shared/types'

interface CalDAVConfigForm {
  serverUrl: string
  username: string
  password: string
  calendarUrl: string
  syncEnabled: boolean
}

interface SyncStatus {
  configured: boolean
  syncEnabled: boolean
  lastSyncAt: string
  lastSyncError: string
  totalMappings: number
  synced: number
  pendingCreate: number
  errors: number
}

const pageOptions: { value: PageName; label: string }[] = [
  { value: 'today', label: '今天' },
  { value: 'planner', label: '规划表' },
  { value: 'projects', label: '科研工作台' },
  { value: 'habits', label: '习惯' },
  { value: 'summary', label: '今日总结' },
]

type SectionId = 'data' | 'pomodoro' | 'sleep' | 'ui' | 'caldav'

export function SettingsPage() {
  const {
    projects,
    tasks,
    blocks,
    habits,
    habitEntries,
    thesisStudents,
    researchLogs,
    pomodoroSessions,
    setProjectFilterId,
    setProjectDetailId,
    setPage,
    persistenceStatus,
    settings,
    updateSettings,
  } = useApp()

  // Local draft for form editing — initialized from context settings.
  // The useEffect below fetches fresh settings from the server on mount.
  const [draft, setDraft] = useState(settings)

  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')

  // CalDAV state
  const [config, setConfig] = useState<CalDAVConfigForm>({
    serverUrl: '',
    username: '',
    password: '',
    calendarUrl: '',
    syncEnabled: false,
  })
  const [passwordModified, setPasswordModified] = useState(false)
  const [hasConfiguredPassword, setHasConfiguredPassword] = useState(false)
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  // Collapsible sections — data is open by default, others collapsed
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set(['data']))

  useEffect(() => {
    settingsApi.get().then(setDraft).catch(reportApiError)
    fetch('/api/caldav/config')
      .then(r => r.json())
      .then(data => {
        setConfig({
          serverUrl: data.serverUrl || '',
          username: data.username || '',
          password: data.password ? '' : '',
          calendarUrl: data.calendarUrl || '',
          syncEnabled: data.syncEnabled || false,
        })
        setHasConfiguredPassword(!!data.password)
      })
      .catch(reportApiError)
    fetch('/api/caldav/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(reportApiError)
  }, [])

  const toggleSection = useCallback((id: SectionId) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const refreshStatus = () => {
    fetch('/api/caldav/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(reportApiError)
  }

  const saveSettings = async (e: FormEvent) => {
    e.preventDefault()
    setSettingsSaving(true)
    setSettingsMessage('')
    try {
      await updateSettings(draft)
      setSettingsMessage('设置已保存')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setSettingsMessage('保存失败: ' + msg)
    }
    setSettingsSaving(false)
  }

  const saveConfig = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const payload = {
        ...config,
        password: passwordModified ? config.password : '****',
      }
      const res = await fetch('/api/caldav/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setMessage(data.ok ? '设置已保存' : '保存失败')
      setPasswordModified(false)
      refreshStatus()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessage('保存失败: ' + msg)
    }
    setSaving(false)
  }

  const testConn = async () => {
    setTesting(true)
    setMessage('')
    try {
      const res = await fetch('/api/caldav/test-connection', { method: 'POST' })
      const data = await res.json()
      setMessage(data.ok ? '连接成功' : '连接失败: ' + data.message)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessage('测试失败: ' + msg)
    }
    setTesting(false)
  }

  const syncNow = async () => {
    setSyncing(true)
    setMessage('')
    try {
      const res = await fetch('/api/caldav/sync', { method: 'POST' })
      const data = await res.json()
      setMessage(
        data.ok
          ? '同步完成: 新建 ' +
              data.created +
              ', 更新 ' +
              data.updated +
              ', 删除 ' +
              data.deleted +
              ', 失败 ' +
              data.errors
          : '同步失败',
      )
      refreshStatus()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessage('同步失败: ' + msg)
    }
    setSyncing(false)
  }

  const resetData = async () => {
    if (!window.confirm('确定要清空本地数据并恢复初始示例吗？')) return
    const seeded = seedState()
    // PUT /api/state now returns the full canonical state after replacement
    try {
      const state = await api.put<AppState>('/state', seeded)
      projects.setItems(state.projects)
      tasks.setItems(state.tasks)
      blocks.setItems(state.blocks)
      habits.setItems(state.habits)
      habitEntries.setItems(state.habitEntries)
      thesisStudents.setItems(state.thesisStudents)
      researchLogs.setItems(state.researchLogs)
      pomodoroSessions.setItems(state.pomodoroSessions)
    } catch {
      // Server unavailable — fall back to local-only reset
      localStorage.setItem('focus-planner-state', JSON.stringify(seeded))
      window.location.reload()
      return
    }
    setProjectFilterId('all')
    setProjectDetailId(null)
    setPage('planner')
  }

  return (
    <section className="dashboard">
      {/* Data Management */}
      <SettingsSection
        id="data"
        title="本地数据"
        subtitle="数据保存与恢复"
        open={openSections.has('data')}
        onToggle={toggleSection}
      >
        <div className="settings-list">
          <div>
            <strong>数据保存</strong>
            <span>
              {persistenceStatus === 'checking'
                ? '正在连接本地数据后端。'
                : persistenceStatus === 'saving'
                  ? '正在保存到本地后端，同时保留浏览器本地副本。'
                  : persistenceStatus === 'server'
                    ? '已保存到本地后端，同时保留浏览器本地副本。'
                    : persistenceStatus === 'error'
                      ? '本地后端保存失败，当前仍保留浏览器本地副本。'
                      : '未连接本地后端，当前仅保存在浏览器本地。'}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-danger outline-action danger"
            onClick={resetData}
          >
            <RotateCcw size={16} />
            恢复初始数据
          </button>
        </div>
      </SettingsSection>

      {/* Pomodoro Settings */}
      <SettingsSection
        id="pomodoro"
        title="番茄钟"
        subtitle="工作与休息时长"
        open={openSections.has('pomodoro')}
        onToggle={toggleSection}
      >
        <form onSubmit={saveSettings} className="settings-form">
          <div className="settings-row">
            <label htmlFor="setting-work-duration">工作时长（分钟）</label>
            <input
              id="setting-work-duration"
              type="number"
              min={1}
              max={120}
              value={draft.workDuration}
              onChange={e => setDraft({ ...draft, workDuration: Number(e.target.value) || 25 })}
            />
          </div>
          <div className="settings-row">
            <label htmlFor="setting-break-duration">短休息（分钟）</label>
            <input
              id="setting-break-duration"
              type="number"
              min={1}
              max={60}
              value={draft.breakDuration}
              onChange={e => setDraft({ ...draft, breakDuration: Number(e.target.value) || 5 })}
            />
          </div>
          <div className="settings-row">
            <label htmlFor="setting-long-break-duration">长休息（分钟）</label>
            <input
              id="setting-long-break-duration"
              type="number"
              min={1}
              max={60}
              value={draft.longBreakDuration}
              onChange={e =>
                setDraft({ ...draft, longBreakDuration: Number(e.target.value) || 15 })
              }
            />
          </div>
          <div className="settings-row">
            <label htmlFor="setting-long-break-interval">长休息间隔（次）</label>
            <input
              id="setting-long-break-interval"
              type="number"
              min={1}
              max={10}
              value={draft.longBreakInterval}
              onChange={e => setDraft({ ...draft, longBreakInterval: Number(e.target.value) || 4 })}
            />
          </div>
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={settingsSaving}>
              {settingsSaving ? '保存中...' : '保存番茄钟设置'}
            </button>
          </div>
          {settingsMessage && <div className="caldav-message">{settingsMessage}</div>}
        </form>
      </SettingsSection>

      {/* Sleep / Do Not Disturb */}
      <SettingsSection
        id="sleep"
        title="作息时间"
        subtitle="免打扰时段"
        open={openSections.has('sleep')}
        onToggle={toggleSection}
      >
        <form onSubmit={saveSettings} className="settings-form">
          <div className="settings-row">
            <label htmlFor="setting-sleep-start">睡觉开始</label>
            <input
              id="setting-sleep-start"
              type="time"
              value={draft.sleepStart}
              onChange={e => setDraft({ ...draft, sleepStart: e.target.value })}
            />
          </div>
          <div className="settings-row">
            <label htmlFor="setting-sleep-end">起床时间</label>
            <input
              id="setting-sleep-end"
              type="time"
              value={draft.sleepEnd}
              onChange={e => setDraft({ ...draft, sleepEnd: e.target.value })}
            />
          </div>
          <div className="caldav-hint">在免打扰时段内，番茄钟自动暂停，不会发送通知。</div>
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={settingsSaving}>
              {settingsSaving ? '保存中...' : '保存作息设置'}
            </button>
          </div>
        </form>
      </SettingsSection>

      {/* UI Preferences */}
      <SettingsSection
        id="ui"
        title="界面偏好"
        subtitle="启动页与同步"
        open={openSections.has('ui')}
        onToggle={toggleSection}
      >
        <form onSubmit={saveSettings} className="settings-form">
          <div className="settings-row">
            <label htmlFor="setting-default-page">默认首页</label>
            <select
              id="setting-default-page"
              value={draft.defaultPage}
              onChange={e => setDraft({ ...draft, defaultPage: e.target.value as PageName })}
            >
              {pageOptions.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <label className="caldav-toggle">
            <input
              type="checkbox"
              checked={draft.autoSyncCalDAV}
              onChange={e => setDraft({ ...draft, autoSyncCalDAV: e.target.checked })}
            />
            每次保存后自动同步 CalDAV
          </label>
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={settingsSaving}>
              {settingsSaving ? '保存中...' : '保存界面设置'}
            </button>
          </div>
        </form>
      </SettingsSection>

      {/* CalDAV Sync */}
      <SettingsSection
        id="caldav"
        title="CalDAV 日历同步"
        subtitle="iCloud / 其他 CalDAV 服务器"
        open={openSections.has('caldav')}
        onToggle={toggleSection}
      >
        <div className="caldav-form">
          <div className="caldav-status">
            {status?.configured && status?.syncEnabled ? (
              <>
                <span className="caldav-dot green" /> 已启用同步
              </>
            ) : status?.configured ? (
              <>
                <span className="caldav-dot yellow" /> 已配置但未启用
              </>
            ) : (
              <>
                <span className="caldav-dot gray" /> 未配置
              </>
            )}
          </div>

          <form onSubmit={saveConfig}>
            <label>服务器地址</label>
            <input
              type="text"
              placeholder="https://caldav.icloud.com"
              value={config.serverUrl}
              onChange={e => setConfig({ ...config, serverUrl: e.target.value })}
            />
            <div className="caldav-hint">CalDAV 服务器根地址，可选</div>

            <label>用户名</label>
            <input
              type="text"
              placeholder="Apple ID / 邮箱"
              value={config.username}
              onChange={e => setConfig({ ...config, username: e.target.value })}
            />

            <label>应用专用密码</label>
            <input
              type="password"
              placeholder={
                hasConfiguredPassword ? '已配置（留空则保持不变）' : 'iCloud 应用专用密码'
              }
              value={config.password}
              onChange={e => {
                setConfig({ ...config, password: e.target.value })
                setPasswordModified(true)
              }}
            />
            <div className="caldav-hint">
              iCloud 需要在 appleid.apple.com 生成应用专用密码
              {hasConfiguredPassword ? '。已配置密码，留空保存不会覆盖。' : ''}
            </div>

            <label>日历 URL</label>
            <input
              type="text"
              placeholder="https://caldav.icloud.com/.../calendars/.../"
              value={config.calendarUrl}
              onChange={e => setConfig({ ...config, calendarUrl: e.target.value })}
            />
            <div className="caldav-hint">完整的日历集合 URL（以 / 结尾）</div>

            <label className="caldav-toggle">
              <input
                type="checkbox"
                checked={config.syncEnabled}
                onChange={e => setConfig({ ...config, syncEnabled: e.target.checked })}
              />
              启用同步
            </label>

            <div className="caldav-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '保存中...' : '保存设置'}
              </button>
              <button type="button" className="btn btn-ghost" disabled={testing} onClick={testConn}>
                {testing ? '测试中...' : '测试连接'}
              </button>
              <button type="button" className="btn btn-ghost" disabled={syncing} onClick={syncNow}>
                {syncing ? '同步中...' : '立即同步'}
              </button>
            </div>
          </form>

          {message && <div className="caldav-message">{message}</div>}

          {status && status.totalMappings > 0 && (
            <div className="caldav-sync-info">
              映射 {status.synced}/{status.totalMappings} 条已同步
              {status.pendingCreate > 0 && ' | ' + status.pendingCreate + ' 条待创建'}
              {status.errors > 0 && ' | ' + status.errors + ' 条失败'}
              {status.lastSyncAt && (
                <>
                  {' '}
                  — 上次同步:{' '}
                  {new Date(status.lastSyncAt).toLocaleString('zh-CN', { hour12: false })}
                </>
              )}
              {status.lastSyncError && (
                <div className="caldav-error">错误: {status.lastSyncError}</div>
              )}
            </div>
          )}
        </div>
      </SettingsSection>
    </section>
  )
}

/* Reusable collapsible section component */
function SettingsSection({
  id,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  id: SectionId
  title: string
  subtitle: string
  open: boolean
  onToggle: (id: SectionId) => void
  children: React.ReactNode
}) {
  return (
    <div className={`card wide settings-section ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="btn btn-ghost settings-section-header"
        onClick={() => onToggle(id)}
        aria-expanded={open ? 'true' : 'false'}
      >
        <div className="card-title">
          <span>{title}</span>
          <small>{subtitle}</small>
        </div>
        <span className={`settings-chevron ${open ? 'open' : ''}`}>›</span>
      </button>
      {open && <div className="settings-section-body">{children}</div>}
    </div>
  )
}
