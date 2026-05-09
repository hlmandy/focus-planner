import { RotateCcw } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { seedState } from '../seed'
import { useState, useEffect, type FormEvent } from 'react'
import { settingsApi } from '../api/settings'
import { DEFAULT_USER_SETTINGS } from '../../shared/types'
import type { UserSettings, PageName } from '../../shared/types'

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

export function SettingsPage() {
  const { projects, tasks, blocks, habits, habitEntries, thesisStudents, researchLogs, pomodoroSessions, setProjectFilterId, setProjectDetailId, setPage, persistenceStatus } = useApp()

  // User settings state
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')

  // CalDAV state
  const [config, setConfig] = useState<CalDAVConfigForm>({
    serverUrl: '', username: '', password: '', calendarUrl: '', syncEnabled: false,
  })
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    settingsApi.get().then(setSettings).catch(() => {})
    fetch('/api/caldav/config').then(r => r.json()).then(data => {
      setConfig({
        serverUrl: data.serverUrl || '',
        username: data.username || '',
        password: data.password || '',
        calendarUrl: data.calendarUrl || '',
        syncEnabled: data.syncEnabled || false,
      })
    }).catch(() => {})
    fetch('/api/caldav/status').then(r => r.json()).then(setStatus).catch(() => {})
  }, [])

  const refreshStatus = () => {
    fetch('/api/caldav/status').then(r => r.json()).then(setStatus).catch(() => {})
  }

  const saveSettings = async (e: FormEvent) => {
    e.preventDefault()
    setSettingsSaving(true)
    setSettingsMessage('')
    try {
      await settingsApi.update(settings)
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
      const res = await fetch('/api/caldav/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      setMessage(data.ok ? '设置已保存' : '保存失败')
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
      setMessage(data.ok
        ? '同步完成: 新建 ' + data.created + ', 更新 ' + data.updated + ', 删除 ' + data.deleted + ', 失败 ' + data.errors
        : '同步失败')
      refreshStatus()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessage('同步失败: ' + msg)
    }
    setSyncing(false)
  }

  return (
    <section className="dashboard">
      {/* Data Management */}
      <div className="card wide">
        <div className="card-title">
          <span>本地设置</span>
          <small>数据与偏好</small>
        </div>
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
            className="outline-action danger"
            onClick={async () => {
              if (!window.confirm('确定要清空本地数据并恢复初始示例吗？')) return
              const seeded = seedState()
              const oldProjects = projects.items.map(p => p.id)
              const oldTasks = tasks.items.map(t => t.id)
              const oldBlocks = blocks.items.map(b => b.id)
              const oldHabits = habits.items.map(h => h.id)
              const oldEntries = habitEntries.items.map(e => e.id)
              const oldStudents = thesisStudents.items.map(s => s.id)
              const oldLogs = researchLogs.items.map(r => r.id)
              const oldPomodoros = pomodoroSessions.items.map(p => p.id)
              projects.setItems(seeded.projects)
              tasks.setItems(seeded.tasks)
              blocks.setItems(seeded.blocks)
              habits.setItems(seeded.habits)
              habitEntries.setItems(seeded.habitEntries)
              thesisStudents.setItems(seeded.thesisStudents)
              researchLogs.setItems(seeded.researchLogs)
              pomodoroSessions.setItems(seeded.pomodoroSessions)
              await Promise.all([
                ...oldProjects.map(id => projects.remove(id).catch(() => {})),
                ...oldTasks.map(id => tasks.remove(id).catch(() => {})),
                ...oldBlocks.map(id => blocks.remove(id).catch(() => {})),
                ...oldHabits.map(id => habits.remove(id).catch(() => {})),
                ...oldEntries.map(id => habitEntries.remove(id).catch(() => {})),
                ...oldStudents.map(id => thesisStudents.remove(id).catch(() => {})),
                ...oldLogs.map(id => researchLogs.remove(id).catch(() => {})),
                ...oldPomodoros.map(id => pomodoroSessions.remove(id).catch(() => {})),
              ])
              await Promise.all([
                ...seeded.projects.map(p => projects.create(p).catch(() => {})),
                ...seeded.tasks.map(t => tasks.create(t).catch(() => {})),
                ...seeded.blocks.map(b => blocks.create(b).catch(() => {})),
                ...seeded.habits.map(h => habits.create(h).catch(() => {})),
                ...seeded.habitEntries.map(e => habitEntries.create(e).catch(() => {})),
                ...seeded.thesisStudents.map(s => thesisStudents.create(s).catch(() => {})),
                ...seeded.researchLogs.map(r => researchLogs.create(r).catch(() => {})),
                ...seeded.pomodoroSessions.map(p => pomodoroSessions.create(p).catch(() => {})),
              ])
              setProjectFilterId('all')
              setProjectDetailId(null)
              setPage('planner')
            }}
          >
            <RotateCcw size={16} />
            恢复初始数据
          </button>
        </div>
      </div>

      {/* Pomodoro Settings */}
      <div className="card wide">
        <div className="card-title">
          <span>番茄钟</span>
          <small>工作与休息时长</small>
        </div>
        <form onSubmit={saveSettings} className="settings-form">
          <div className="settings-row">
            <label htmlFor="setting-work-duration">工作时长（分钟）</label>
            <input
              id="setting-work-duration"
              type="number"
              min={1}
              max={120}
              value={settings.workDuration}
              onChange={e => setSettings({ ...settings, workDuration: Number(e.target.value) || 25 })}
            />
          </div>
          <div className="settings-row">
            <label htmlFor="setting-break-duration">短休息（分钟）</label>
            <input
              id="setting-break-duration"
              type="number"
              min={1}
              max={60}
              value={settings.breakDuration}
              onChange={e => setSettings({ ...settings, breakDuration: Number(e.target.value) || 5 })}
            />
          </div>
          <div className="settings-row">
            <label htmlFor="setting-long-break-duration">长休息（分钟）</label>
            <input
              id="setting-long-break-duration"
              type="number"
              min={1}
              max={60}
              value={settings.longBreakDuration}
              onChange={e => setSettings({ ...settings, longBreakDuration: Number(e.target.value) || 15 })}
            />
          </div>
          <div className="settings-row">
            <label htmlFor="setting-long-break-interval">长休息间隔（次）</label>
            <input
              id="setting-long-break-interval"
              type="number"
              min={1}
              max={10}
              value={settings.longBreakInterval}
              onChange={e => setSettings({ ...settings, longBreakInterval: Number(e.target.value) || 4 })}
            />
          </div>
          <div className="settings-form-actions">
            <button type="submit" disabled={settingsSaving}>
              {settingsSaving ? '保存中...' : '保存番茄钟设置'}
            </button>
          </div>
          {settingsMessage && <div className="caldav-message">{settingsMessage}</div>}
        </form>
      </div>

      {/* Sleep / Do Not Disturb */}
      <div className="card wide">
        <div className="card-title">
          <span>作息时间</span>
          <small>免打扰时段</small>
        </div>
        <form onSubmit={saveSettings} className="settings-form">
          <div className="settings-row">
            <label htmlFor="setting-sleep-start">睡觉开始</label>
            <input
              id="setting-sleep-start"
              type="time"
              value={settings.sleepStart}
              onChange={e => setSettings({ ...settings, sleepStart: e.target.value })}
            />
          </div>
          <div className="settings-row">
            <label htmlFor="setting-sleep-end">起床时间</label>
            <input
              id="setting-sleep-end"
              type="time"
              value={settings.sleepEnd}
              onChange={e => setSettings({ ...settings, sleepEnd: e.target.value })}
            />
          </div>
          <div className="caldav-hint">在免打扰时段内，番茄钟自动暂停，不会发送通知。</div>
          <div className="settings-form-actions">
            <button type="submit" disabled={settingsSaving}>
              {settingsSaving ? '保存中...' : '保存作息设置'}
            </button>
          </div>
        </form>
      </div>

      {/* UI Preferences */}
      <div className="card wide">
        <div className="card-title">
          <span>界面偏好</span>
          <small>启动页与同步</small>
        </div>
        <form onSubmit={saveSettings} className="settings-form">
          <div className="settings-row">
            <label htmlFor="setting-default-page">默认首页</label>
            <select
              id="setting-default-page"
              value={settings.defaultPage}
              onChange={e => setSettings({ ...settings, defaultPage: e.target.value as PageName })}
            >
              {pageOptions.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <label className="caldav-toggle">
            <input
              type="checkbox"
              checked={settings.autoSyncCalDAV}
              onChange={e => setSettings({ ...settings, autoSyncCalDAV: e.target.checked })}
            />
            每次保存后自动同步 CalDAV
          </label>
          <div className="settings-form-actions">
            <button type="submit" disabled={settingsSaving}>
              {settingsSaving ? '保存中...' : '保存界面设置'}
            </button>
          </div>
        </form>
      </div>

      {/* CalDAV Sync */}
      <div className="card wide">
        <div className="card-title">
          <span>CalDAV 日历同步</span>
          <small>iCloud / 其他 CalDAV 服务器</small>
        </div>
        <div className="caldav-form">
          <div className="caldav-status">
            {status?.configured && status?.syncEnabled
              ? <><span className="caldav-dot green" /> 已启用同步</>
              : status?.configured
                ? <><span className="caldav-dot yellow" /> 已配置但未启用</>
                : <><span className="caldav-dot gray" /> 未配置</>}
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
              placeholder="iCloud 应用专用密码"
              value={config.password}
              onChange={e => setConfig({ ...config, password: e.target.value })}
            />
            <div className="caldav-hint">iCloud 需要在 appleid.apple.com 生成应用专用密码</div>

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
              <button type="submit" disabled={saving}>
                {saving ? '保存中...' : '保存设置'}
              </button>
              <button type="button" disabled={testing} onClick={testConn}>
                {testing ? '测试中...' : '测试连接'}
              </button>
              <button type="button" disabled={syncing} onClick={syncNow}>
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
                <> — 上次同步: {new Date(status.lastSyncAt).toLocaleString('zh-CN', { hour12: false })}</>
              )}
              {status.lastSyncError && (
                <div className="caldav-error">错误: {status.lastSyncError}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
