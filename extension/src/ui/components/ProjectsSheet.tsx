/**
 * ProjectsSheet — geçmiş oyun projeleri ("Projelerim"). Sağdan açılır,
 * her projeyi açma/klasörde gösterme imkânı verir.
 */
import React from 'react';
import { X, Gamepad2, FolderOpen, Clock } from 'lucide-react';
import { useStore } from '../store.js';

const TYPE_LABEL: Record<string, string> = {
  'bullet-heaven': 'Bullet-Heaven', platformer: '2D Platformer', 'top-down-rpg': 'Top-down RPG',
  fps: '3D FPS', roguelike: 'Roguelike', 'farm-sim': 'Çiftlik', strategy: 'Strateji', adventure: 'Macera',
};

function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'az önce';
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
  return `${Math.floor(s / 86400)} gün önce`;
}

export function ProjectsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { projects, postMessage } = useStore();
  const sorted = [...projects].sort((a, b) => b.ts - a.ts);

  return (
    <>
      <div className={`zsheet-scrim ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`zsheet ${open ? 'open' : ''}`}>
        <header className="zsheet-head">
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Projelerim</div>
            <div className="zxs zmuted">Ürettiğin oyunlar — aç ve devam et.</div>
          </div>
          <button className="zsheet-x" onClick={onClose} title="Kapat"><X size={16} strokeWidth={1.75} /></button>
        </header>

        <div className="zsheet-body">
          {sorted.length === 0 ? (
            <div className="zrail-empty" style={{ textAlign: 'center', padding: '40px 20px' }}>
              Henüz proje yok. Bir oyun tarif edip <b>Oyunu Kur</b> de — burada birikir.
            </div>
          ) : sorted.map((p) => (
            <div key={p.path} className="zprovider" style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span className="zproj-ic"><Gamepad2 size={16} strokeWidth={1.8} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="zclamp" style={{ fontWeight: 650, fontSize: 13 }}>{p.title}</div>
                <div className="zxs zmuted flex items-center gap-2" style={{ marginTop: 2 }}>
                  <span>{TYPE_LABEL[p.gameType] ?? p.gameType}</span>
                  <span className="flex items-center gap-1"><Clock size={10} strokeWidth={2} /> {ago(p.ts)}</span>
                </div>
              </div>
              <button className="zicon-btn" title="Projeyi aç" onClick={() => { postMessage({ type: 'open-project', payload: { path: p.path } }); onClose(); }}>
                <FolderOpen size={15} strokeWidth={1.8} />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
