import React, { useState } from 'react';
import { useStore } from '../store.js';
import type { Platform, BuildResult } from '../../types/index.js';

const PLATFORMS: Array<{ id: Platform; label: string; icon: string; hosting: string[] }> = [
  { id: 'web',       label: 'Web (HTML5)',  icon: '🌐', hosting: ['itch-io', 'github-pages'] },
  { id: 'windows',   label: 'Windows',     icon: '🪟', hosting: ['steam', 'itch-io'] },
  { id: 'linux',     label: 'Linux',       icon: '🐧', hosting: ['steam', 'itch-io'] },
  { id: 'macos',     label: 'macOS',       icon: '🍎', hosting: ['steam', 'itch-io'] },
  { id: 'android',   label: 'Android',     icon: '🤖', hosting: ['google-play'] },
  { id: 'ios',       label: 'iOS',         icon: '📱', hosting: ['app-store'] },
  { id: 'steamdeck', label: 'Steam Deck',  icon: '🎮', hosting: ['steam'] },
];

function bytes(n: number): string {
  if (!n) return '—';
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;
}

function StatusChip({ result }: { result?: BuildResult }) {
  if (!result) return <span className="zbadge" style={{ background: 'var(--z-muted)', color: 'rgba(255,255,255,0.3)' }}>—</span>;
  const map = { idle: 'rgba(255,255,255,0.3)', pending: 'var(--z-warning)', building: 'var(--z-accent)', success: 'var(--z-success)', failed: 'var(--z-danger)' };
  const label = { idle: '—', pending: '⏳ Bekliyor', building: '🔨 Build', success: '✓ Hazır', failed: '✗ Hata' };
  return (
    <span className="zsm" style={{ color: map[result.status] ?? map.idle }}>
      {label[result.status] ?? '—'}
    </span>
  );
}

export function DeployPanel() {
  const { buildResults, isBuildingAll, postMessage } = useStore();
  const [enabled, setEnabled] = useState<Set<Platform>>(new Set(['web', 'windows', 'android']));

  const toggle = (p: Platform) =>
    setEnabled((prev) => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3 py-3" style={{ gap: 14 }}>
      {/* Build all */}
      <div className="glass" style={{ padding: '14px 16px' }}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Tüm Platformlara Build</div>
            <div className="zsm zmuted mt-0.5">{enabled.size} platform seçili</div>
          </div>
          <button className="zbtn zbtn-primary" disabled={isBuildingAll || enabled.size === 0}
            onClick={() => postMessage({ type: 'build-all' })}>
            {isBuildingAll ? <><span className="z-spin inline-block mr-1.5">⚙</span>Build ediliyor…</> : '📦 Hepsini Build Et'}
          </button>
        </div>
      </div>

      {/* Platforms */}
      <div>
        <div className="zsec-head">Platformlar</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PLATFORMS.map(({ id, label, icon, hosting }) => {
            const result = buildResults[id];
            const on = enabled.has(id);
            return (
              <div key={id} className="glass-muted" style={{ padding: '12px 14px', borderRadius: 10 }}>
                <div className="flex items-center gap-3">
                  {/* Toggle */}
                  <label className="ztoggle" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={on} onChange={() => toggle(id)} />
                    <div className="ztoggle-track" />
                    <div className="ztoggle-thumb" />
                  </label>

                  <span style={{ fontSize: 18 }}>{icon}</span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{label}</span>
                      <StatusChip result={result} />
                    </div>
                    {result?.outputPath && (
                      <div className="zxs zmuted truncate mt-0.5">{result.outputPath}</div>
                    )}
                  </div>

                  {result?.fileSize && (
                    <span className="zsm zmuted flex-shrink-0">{bytes(result.fileSize)}</span>
                  )}

                  <button className="zbtn zbtn-ghost zsm flex-shrink-0"
                    style={{ padding: '4px 10px' }}
                    disabled={result?.status === 'building'}
                    onClick={() => postMessage({ type: 'build-platform', payload: { platform: id } })}>
                    {result?.status === 'building' ? <span className="z-spin inline-block">⚙</span> : '▶'}
                  </button>
                </div>

                {/* Error */}
                {result?.status === 'failed' && result.error && (
                  <div className="zxs font-mono mt-2 p-2 rounded" style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--z-danger)', border: '1px solid rgba(248,113,113,0.2)', lineHeight: 1.5 }}>
                    {result.error}
                  </div>
                )}

                {/* Deploy buttons */}
                {result?.status === 'success' && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {hosting.map((h) => (
                      <button key={h} className="zbtn zbtn-ghost zxs"
                        style={{ padding: '3px 10px' }}
                        onClick={() => postMessage({ type: 'deploy', payload: { platform: id, hosting: h } })}>
                        🚀 {h}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
