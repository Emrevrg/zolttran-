import React, { useState } from 'react';
import { useStore } from '../store.js';
import type { AgentType, AgentTask, OrchestratorMode } from '../../types/index.js';

const AGENTS: Array<{ type: AgentType; icon: string; label: string; desc: string; color: string }> = [
  { type: 'architect', icon: '🏗️', label: 'Mimar',    desc: 'Oyun tasarımı & GDD',       color: '#a78bfa' },
  { type: 'coder',     icon: '💻', label: 'Geliştirici',desc: 'GDScript / C# kod üretimi', color: '#34d399' },
  { type: 'artist',    icon: '🎨', label: 'Sanatçı',  desc: 'Sprite & shader üretimi',   color: '#f472b6' },
  { type: 'debugger',  icon: '🔧', label: 'Debugger', desc: 'Test & hata düzeltme',       color: '#fbbf24' },
  { type: 'devops',    icon: '🚀', label: 'DevOps',   desc: 'Build & deploy',             color: '#22d3ee' },
];

const MODE_LABELS: Record<OrchestratorMode, string> = {
  orchestrator: '⚡ Tam Otonom',
  architect: '🏗️ Tasarım',
  code: '💻 Kod',
  debug: '🔧 Debug',
  ask: '💬 Soru-Cevap',
};

export function AgentPanel() {
  const { agentStatuses, activeTasks, completedTasks, orchestratorMode, setOrchestratorMode } = useStore();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3 py-3" style={{ gap: 16 }}>
      {/* Orchestrator mode */}
      <section>
        <div className="zsec-head">Orchestrator Modu</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(MODE_LABELS) as Array<[OrchestratorMode, string]>).map(([mode, label]) => (
            <button key={mode} onClick={() => setOrchestratorMode(mode)}
              className="zbtn zsm"
              style={{
                padding: '5px 12px',
                background: orchestratorMode === mode ? 'rgba(124,106,247,0.25)' : 'var(--z-muted)',
                border: `1px solid ${orchestratorMode === mode ? 'rgba(124,106,247,0.4)' : 'var(--z-muted-bdr)'}`,
                color: orchestratorMode === mode ? '#a78bfa' : 'rgba(255,255,255,0.55)',
                fontWeight: orchestratorMode === mode ? 600 : 400,
              }}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Agent cards */}
      <section>
        <div className="zsec-head">Agent Ekibi</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {AGENTS.map(({ type, icon, label, desc, color }) => {
            const status = agentStatuses[type];
            const task = activeTasks.find((t) => t.agentType === type);
            const isActive = status === 'executing';
            return (
              <div key={type} className="glass-muted" style={{ padding: '12px 14px', borderRadius: 10, borderLeft: `3px solid ${isActive ? color : 'transparent'}` }}>
                <div className="flex items-center gap-3">
                  <div style={{ fontSize: 20, lineHeight: 1 }}>{icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
                      <StatusDot status={status} />
                    </div>
                    <div className="zsm zmuted">{desc}</div>
                  </div>
                  {isActive && <div className="z-spin" style={{ fontSize: 14, color }}>⚙</div>}
                </div>
                {task && (
                  <div style={{ marginTop: 10 }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="zsm zmuted truncate" style={{ maxWidth: '80%' }}>{task.title}</span>
                      <span className="zsm" style={{ color, flexShrink: 0 }}>{task.progress}%</span>
                    </div>
                    <div className="zprog-track"><div className="zprog-fill" style={{ width: `${task.progress}%` }} /></div>
                    <button className="zxs zmuted mt-1 hover:text-white transition-colors"
                      onClick={() => setExpanded(expanded === task.id ? null : task.id)}>
                      {expanded === task.id ? '▲ Gizle' : `▼ ${task.logs.length} log`}
                    </button>
                    {expanded === task.id && <LogView task={task} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Active tasks */}
      {activeTasks.length > 0 && (
        <section>
          <div className="zsec-head">Aktif Görevler ({activeTasks.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeTasks.map((t) => <TaskCard key={t.id} task={t} expanded={expanded === t.id} onExpand={setExpanded} />)}
          </div>
        </section>
      )}

      {/* Completed */}
      {completedTasks.length > 0 && (
        <section>
          <div className="zsec-head">Tamamlanan ({completedTasks.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {completedTasks.slice(0, 10).map((t) => <TaskCard key={t.id} task={t} expanded={expanded === t.id} onExpand={setExpanded} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    idle: 'zdot-idle', executing: 'zdot-executing', thinking: 'zdot-executing',
    waiting: 'zdot-warning', completed: 'zdot-connected', failed: 'zdot-error',
  };
  return <span className={`zdot ${map[status] ?? 'zdot-idle'}`} />;
}

function TaskCard({ task, expanded, onExpand }: { task: AgentTask; expanded: boolean; onExpand: (id: string | null) => void }) {
  const agent = AGENTS.find((a) => a.type === task.agentType);
  const isOk = task.status === 'completed';
  const isFail = task.status === 'failed';
  return (
    <div className="glass-muted" style={{ padding: '8px 12px', borderRadius: 8 }}>
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 14 }}>{agent?.icon}</span>
        <span className="zsm flex-1 truncate">{task.title}</span>
        <span className="zsm" style={{ color: isOk ? 'var(--z-success)' : isFail ? 'var(--z-danger)' : 'var(--z-warning)', flexShrink: 0 }}>
          {isOk ? '✓' : isFail ? '✗' : '⏳'}
        </span>
      </div>
      {task.status === 'executing' && (
        <div className="zprog-track mt-1.5"><div className="zprog-fill" style={{ width: `${task.progress}%` }} /></div>
      )}
      <button className="zxs zmuted mt-1 hover:text-white transition-colors"
        onClick={() => onExpand(expanded ? null : task.id)}>
        {expanded ? '▲' : '▼'} {task.logs.length} log
      </button>
      {expanded && <LogView task={task} />}
    </div>
  );
}

function LogView({ task }: { task: AgentTask }) {
  return (
    <div style={{ marginTop: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '8px 10px', maxHeight: 120, overflowY: 'auto' }}>
      {task.logs.slice(-25).map((log, i) => (
        <div key={i} className="zxs font-mono leading-relaxed" style={{
          color: log.level === 'error' ? 'var(--z-danger)' : log.level === 'warn' ? 'var(--z-warning)' : 'rgba(255,255,255,0.4)'
        }}>{log.message}</div>
      ))}
      {task.logs.length === 0 && <div className="zxs zmuted">Henüz log yok</div>}
    </div>
  );
}
