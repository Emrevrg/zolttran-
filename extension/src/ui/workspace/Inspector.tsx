/**
 * Inspector — Studio'nun sağ paneli: proje/asset ağacı + canlı süreç +
 * derleme hedefleri. (Tesana'daki sağ asset/scene ağacı + build.)
 */
import React, { useState } from 'react';
import {
  DraftingCompass, Code2, Palette, Bug, Rocket, Gamepad2, Package, Plug, Settings2,
  ChevronRight, FileCode2, Image as ImageIcon, Box, Music, Layers, FileText,
  Globe, Monitor, Apple, Terminal, Smartphone, type LucideIcon,
} from 'lucide-react';
import { useStore } from '../store.js';
import type { AgentType, Platform, GodotAsset } from '../../types/index.js';

const AGENTS: Array<{ type: AgentType; icon: LucideIcon; label: string; color: string }> = [
  { type: 'architect', icon: DraftingCompass, label: 'Mimar',       color: '#a78bfa' },
  { type: 'coder',     icon: Code2,           label: 'Geliştirici', color: '#34d399' },
  { type: 'artist',    icon: Palette,         label: 'Sanatçı',     color: '#f472b6' },
  { type: 'debugger',  icon: Bug,             label: 'Debugger',    color: '#fbbf24' },
  { type: 'devops',    icon: Rocket,          label: 'DevOps',      color: '#22d3ee' },
];

const BUILD_TARGETS: Array<{ id: Platform; label: string; icon: LucideIcon }> = [
  { id: 'web',     label: 'Web',     icon: Globe },
  { id: 'windows', label: 'Windows', icon: Monitor },
  { id: 'macos',   label: 'macOS',   icon: Apple },
  { id: 'linux',   label: 'Linux',   icon: Terminal },
  { id: 'android', label: 'Android', icon: Smartphone },
  { id: 'ios',     label: 'iOS',     icon: Smartphone },
];

const ASSET_ICON: Record<string, LucideIcon> = {
  texture: ImageIcon, model: Box, sound: Music, shader: Layers, material: Layers,
  scene: Gamepad2, script: FileCode2, other: FileText,
};

const STATUS_DOT: Record<string, string> = {
  idle: 'zdot-idle', executing: 'zdot-executing', thinking: 'zdot-executing',
  waiting: 'zdot-warning', completed: 'zdot-connected', failed: 'zdot-error',
};

export function Inspector({ onOpenProviders }: { onOpenProviders: () => void }) {
  const {
    agentStatuses, activeTasks, completedTasks,
    currentProject, currentGdd, buildResults, isBuildingAll,
    godotConnected, godotBridgeMethod, postMessage,
  } = useStore();

  const anyActive = Object.values(agentStatuses).some((s) => s === 'executing' || s === 'thinking');
  const open = (path: string) => postMessage({ type: 'open-file', payload: { path } });
  const base = (p: string) => p.split(/[\\/]/).pop() ?? p;

  return (
    <div className="zinspect">
      {/* Proje başlığı */}
      <div className="zinspect-proj">
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <Gamepad2 size={15} strokeWidth={1.8} style={{ color: 'var(--z-secondary)', flexShrink: 0 }} />
          <span className="zclamp" style={{ fontWeight: 650, fontSize: 13 }}>{currentGdd?.title ?? currentProject?.name ?? 'Yeni Oyun'}</span>
        </div>
        {currentGdd && <div className="zxs zmuted" style={{ marginTop: 3 }}>{currentGdd.gameType}{currentGdd.genre?.length ? ` · ${currentGdd.genre.slice(0, 2).join(', ')}` : ''}</div>}
      </div>

      {/* Asset / sahne ağacı */}
      <Tree title="Sahneler" count={currentProject?.scenes.length}>
        {currentProject?.scenes.map((s) => (
          <Leaf key={s.path} icon={Gamepad2} label={base(s.resourcePath || s.path)} onClick={() => open(s.path)} />
        ))}
      </Tree>
      <Tree title="Scriptler" count={currentProject?.scripts.length}>
        {currentProject?.scripts.map((s) => (
          <Leaf key={s.path} icon={FileCode2} label={base(s.path)} onClick={() => open(s.path)}
            badge={s.errors?.length ? <span className="zxs" style={{ color: 'var(--z-danger)' }}>{s.errors.length}</span> : undefined} />
        ))}
      </Tree>
      <Tree title="Varlıklar" count={currentProject?.assets.length}>
        {currentProject?.assets.map((a: GodotAsset) => {
          const Ic = ASSET_ICON[a.type] ?? FileText;
          return <Leaf key={a.path} icon={Ic} label={base(a.path)} onClick={() => open(a.path)} />;
        })}
      </Tree>

      {/* Canlı süreç */}
      <div className="zinspect-sec">
        <div className="zinspect-h">Süreç {anyActive && <span className="zchip zchip-run">çalışıyor</span>}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {AGENTS.map((a) => {
            const status = agentStatuses[a.type] ?? 'idle';
            const task = activeTasks.find((t) => t.agentType === a.type);
            const active = status === 'executing' || status === 'thinking';
            const Icon = a.icon;
            return (
              <div key={a.type} className="zrail-agent" style={{ borderLeft: `2px solid ${active ? a.color : 'transparent'}` }}>
                <div className="flex items-center gap-2.5">
                  <Icon size={14} strokeWidth={1.8} style={{ color: active ? a.color : 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                  <span className="zsm" style={{ flex: 1, fontWeight: active ? 600 : 400, color: active ? '#fff' : 'rgba(255,255,255,0.6)' }}>{a.label}</span>
                  <span className={`zdot ${STATUS_DOT[status] ?? 'zdot-idle'}`} />
                </div>
                {task && (
                  <div style={{ marginTop: 5 }}>
                    <div className="zxs zmuted zclamp" style={{ marginBottom: 3 }}>{task.title}</div>
                    <div className="zprog-track"><div className="zprog-fill" style={{ width: `${task.progress}%` }} /></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {activeTasks.length === 0 && completedTasks.length > 0 && (
          <div className="zxs zmuted" style={{ marginTop: 6 }}>{completedTasks.length} görev tamamlandı</div>
        )}
      </div>

      {/* Derleme */}
      <div className="zinspect-sec">
        <div className="zinspect-h">Derleme & Yayın {isBuildingAll && <span className="zchip zchip-run">derleniyor</span>}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {BUILD_TARGETS.map((t) => {
            const st = buildResults[t.id]?.status ?? 'idle';
            const Icon = t.icon;
            return (
              <div key={t.id} className="zrail-build">
                <Icon size={13} strokeWidth={1.8} style={{ opacity: 0.75, flexShrink: 0 }} />
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
            <Package size={13} strokeWidth={1.8} /> {isBuildingAll ? 'Tümü derleniyor…' : 'Tümünü Derle'}
          </button>
        </div>
      </div>

      {/* Godot + providers */}
      <div className="zinspect-sec">
        <div className="zrail-build">
          <Plug size={13} strokeWidth={1.8} style={{ color: godotConnected ? 'var(--z-success)' : 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
          <span className="zsm" style={{ flex: 1 }}>{godotConnected ? `Godot bağlı (${godotBridgeMethod?.toUpperCase() ?? 'MCP'})` : 'Godot bağlı değil'}</span>
          {!godotConnected && <button className="zbtn-link zxs" onClick={() => postMessage({ type: 'run-godot-bridge' })}>Bağlan</button>}
        </div>
        <button className="zbtn zbtn-ghost zsm w-full justify-center" style={{ marginTop: 6 }} onClick={onOpenProviders}>
          <Settings2 size={13} strokeWidth={1.8} /> Provider'ları Yönet
        </button>
      </div>
    </div>
  );
}

function Tree({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const has = React.Children.count(children) > 0;
  return (
    <div className="ztree">
      <button className="ztree-head" onClick={() => setOpen((v) => !v)}>
        <ChevronRight size={13} strokeWidth={2} className="ztree-caret" style={{ transform: open ? 'rotate(90deg)' : 'none' }} />
        <span>{title}</span>
        <span className="ztree-count">{count ?? 0}</span>
      </button>
      {open && (has
        ? <div className="ztree-body">{children}</div>
        : <div className="ztree-empty">—</div>)}
    </div>
  );
}

function Leaf({ icon: Icon, label, onClick, badge }: { icon: LucideIcon; label: string; onClick?: () => void; badge?: React.ReactNode }) {
  return (
    <button className="ztree-leaf" onClick={onClick} title={label}>
      <Icon size={13} strokeWidth={1.75} style={{ flexShrink: 0, opacity: 0.8 }} />
      <span className="zclamp" style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {badge}
    </button>
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
