/**
 * LiveRail — "her süreci gör ve kontrol et" içeriği (sağ çekmecede yaşar).
 * Emoji yok; ince Lucide ikonlar.
 */
import React from 'react';
import {
  DraftingCompass, Code2, Palette, Bug, Rocket, Gamepad2, Play, Square, RotateCw,
  Globe, MonitorSmartphone, Terminal, Package, Plug, Settings2, type LucideIcon,
} from 'lucide-react';
import { useStore } from '../store.js';
import type { AgentType, Platform } from '../../types/index.js';

const AGENTS: Array<{ type: AgentType; icon: LucideIcon; label: string; color: string }> = [
  { type: 'architect', icon: DraftingCompass, label: 'Mimar',      color: '#a78bfa' },
  { type: 'coder',     icon: Code2,           label: 'Geliştirici', color: '#34d399' },
  { type: 'artist',    icon: Palette,         label: 'Sanatçı',     color: '#f472b6' },
  { type: 'debugger',  icon: Bug,             label: 'Debugger',    color: '#fbbf24' },
  { type: 'devops',    icon: Rocket,          label: 'DevOps',      color: '#22d3ee' },
];

const BUILD_TARGETS: Array<{ id: Platform; label: string; icon: LucideIcon }> = [
  { id: 'web',     label: 'Web',     icon: Globe },
  { id: 'windows', label: 'Windows', icon: MonitorSmartphone },
  { id: 'linux',   label: 'Linux',   icon: Terminal },
];

const STATUS_DOT: Record<string, string> = {
  idle: 'zdot-idle', executing: 'zdot-executing', thinking: 'zdot-executing',
  waiting: 'zdot-warning', completed: 'zdot-connected', failed: 'zdot-error',
};

export function LiveRail({ onOpenProviders }: { onOpenProviders: () => void }) {
  const {
    agentStatuses, activeTasks, completedTasks,
    currentProject, currentGdd, preview, buildResults, isBuildingAll,
    godotConnected, godotBridgeMethod, postMessage,
  } = useStore();

  const anyActive = Object.values(agentStatuses).some((s) => s === 'executing' || s === 'thinking');

  return (
    <div className="zrail-body">
      <Section title="Süreç" badge={anyActive ? <span className="zchip zchip-run">çalışıyor</span> : undefined}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {AGENTS.map((a) => {
            const status = agentStatuses[a.type] ?? 'idle';
            const task = activeTasks.find((t) => t.agentType === a.type);
            const active = status === 'executing' || status === 'thinking';
            const Icon = a.icon;
            return (
              <div key={a.type} className="zrail-agent" style={{ borderLeft: `2px solid ${active ? a.color : 'transparent'}` }}>
                <div className="flex items-center gap-2.5">
                  <Icon size={15} strokeWidth={1.75} style={{ color: active ? a.color : 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                  <span className="zsm" style={{ flex: 1, fontWeight: active ? 600 : 400, color: active ? '#fff' : 'rgba(255,255,255,0.62)' }}>{a.label}</span>
                  <span className={`zdot ${STATUS_DOT[status] ?? 'zdot-idle'}`} />
                </div>
                {task && (
                  <div style={{ marginTop: 6 }}>
                    <div className="zxs zmuted zclamp" style={{ marginBottom: 3 }}>{task.title}</div>
                    <div className="zprog-track"><div className="zprog-fill" style={{ width: `${task.progress}%` }} /></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {activeTasks.length === 0 && completedTasks.length > 0 && (
          <div className="zxs zmuted" style={{ marginTop: 8 }}>{completedTasks.length} görev tamamlandı</div>
        )}
      </Section>

      <Section title="Proje">
        {currentProject || currentGdd ? (
          <div className="zrail-card">
            <div className="flex items-center gap-2" style={{ marginBottom: 3 }}>
              <Gamepad2 size={14} strokeWidth={1.75} style={{ color: 'var(--z-secondary)' }} />
              <span style={{ fontWeight: 600, fontSize: 12.5 }}>{currentGdd?.title ?? currentProject?.name ?? 'Oyun'}</span>
            </div>
            {currentGdd && <div className="zxs zmuted">{currentGdd.gameType} · {currentGdd.genre?.slice(0, 2).join(', ')}</div>}
            {currentProject && (
              <button className="zbtn zbtn-ghost zxs" style={{ marginTop: 8, padding: '3px 10px' }}
                onClick={() => postMessage({ type: 'open-file', payload: { path: `${currentProject.path}/project.godot` } })}>
                Projeyi Aç
              </button>
            )}
          </div>
        ) : <div className="zrail-empty">Henüz proje yok. Oyununu tarif et — AI kurar.</div>}
      </Section>

      <Section title="Canlı Önizleme" badge={preview.running ? <span className="zchip zchip-free">açık</span> : undefined}>
        <div className="zrail-card">
          {preview.running ? (
            <>
              <div className="flex items-center gap-2 zsm" style={{ color: 'var(--z-success)' }}>
                <span className="zdot zdot-connected" /> Oyun çalışıyor
              </div>
              <div className="zxs zmuted" style={{ marginTop: 4 }}>{preview.url ?? `localhost:${preview.port}`}{preview.fps ? ` · ${preview.fps} FPS` : ''}</div>
              <div className="flex gap-1.5" style={{ marginTop: 8 }}>
                <button className="zbtn zbtn-ghost zxs" style={{ padding: '3px 10px' }} onClick={() => postMessage({ type: 'reload-preview' })}><RotateCw size={12} strokeWidth={1.75} /> Yenile</button>
                <button className="zbtn zbtn-danger zxs" style={{ padding: '3px 10px' }} onClick={() => postMessage({ type: 'stop-preview' })}><Square size={11} strokeWidth={2} /> Durdur</button>
              </div>
            </>
          ) : (
            <button className="zbtn zbtn-primary zsm w-full justify-center" onClick={() => postMessage({ type: 'run-preview' })}>
              <Play size={14} strokeWidth={2} /> Oyunu Çalıştır
            </button>
          )}
        </div>
      </Section>

      <Section title="Derleme & Yayın" badge={isBuildingAll ? <span className="zchip zchip-run">derleniyor</span> : undefined}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {BUILD_TARGETS.map((t) => {
            const st = buildResults[t.id]?.status ?? 'idle';
            const Icon = t.icon;
            return (
              <div key={t.id} className="zrail-build">
                <Icon size={14} strokeWidth={1.75} style={{ opacity: 0.75, flexShrink: 0 }} />
                <span className="zsm" style={{ flex: 1 }}>{t.label}</span>
                <BuildBadge status={st} />
                <button className="zbtn-link zxs" disabled={st === 'building'}
                  onClick={() => postMessage({ type: 'build-platform', payload: { platform: t.id } })}>
                  {st === 'building' ? 'derleniyor' : 'Derle'}
                </button>
              </div>
            );
          })}
          <button className="zbtn zbtn-ghost zsm w-full justify-center" style={{ marginTop: 2 }}
            disabled={isBuildingAll} onClick={() => postMessage({ type: 'build-all' })}>
            <Package size={14} strokeWidth={1.75} /> {isBuildingAll ? 'Tümü derleniyor…' : 'Tüm Platformlara Derle'}
          </button>
        </div>
      </Section>

      <Section title="Godot Köprüsü">
        <div className="zrail-build">
          <Plug size={14} strokeWidth={1.75} style={{ color: godotConnected ? 'var(--z-success)' : 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
          <span className="zsm" style={{ flex: 1 }}>{godotConnected ? `Bağlı (${godotBridgeMethod?.toUpperCase() ?? 'MCP'})` : 'Bağlı değil'}</span>
          {!godotConnected && <button className="zbtn-link zxs" onClick={() => postMessage({ type: 'run-godot-bridge' })}>Bağlan</button>}
        </div>
      </Section>

      <button className="zbtn zbtn-ghost zsm w-full justify-center" style={{ marginTop: 4 }} onClick={onOpenProviders}>
        <Settings2 size={14} strokeWidth={1.75} /> Provider'ları Yönet
      </button>
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
        <div className="zsec-head" style={{ margin: 0 }}>{title}</div>
        {badge}
      </div>
      {children}
    </section>
  );
}

function BuildBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; t: string }> = {
    success: { c: 'var(--z-success)', t: 'hazır' }, failed: { c: 'var(--z-danger)', t: 'hata' },
    building: { c: 'var(--z-warning)', t: '…' }, pending: { c: 'var(--z-warning)', t: '…' },
    idle: { c: 'rgba(255,255,255,0.3)', t: '—' },
  };
  const m = map[status] ?? map.idle;
  return <span className="zxs" style={{ color: m.c, flexShrink: 0 }}>{m.t}</span>;
}
