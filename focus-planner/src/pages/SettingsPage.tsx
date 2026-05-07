import { RotateCcw } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { normalizeState, seedState } from '../seed'

export function SettingsPage() {
  const { setState, setProjectFilterId, setProjectDetailId, setPage, persistenceStatus } = useApp()

  return (
    <section className="dashboard">
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
                    ? '已保存到本地后端 JSON 文件，同时保留浏览器本地副本。'
                    : persistenceStatus === 'error'
                      ? '本地后端保存失败，当前仍保留浏览器本地副本。'
                      : '未连接本地后端，当前仅保存在浏览器本地。'}
            </span>
          </div>
          <button
            className="outline-action danger"
            onClick={() => {
              if (!window.confirm('确定要清空本地数据并恢复初始示例吗？')) return
              setState(normalizeState(seedState()))
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
    </section>
  )
}
