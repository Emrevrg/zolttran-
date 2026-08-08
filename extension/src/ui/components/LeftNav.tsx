/**
 * LeftNav — dar dikey ikon navigasyonu (tesana tarzı).
 * Emoji yok; sadece ince çizgi ikonlar. Sağ süreç çekmecesini buradan aç/kapat.
 */
import React from 'react';
import { Sparkles, Activity, Play, Hammer, Settings, type LucideIcon } from 'lucide-react';
import { useStore } from '../store.js';
import { ZOLTTRAN_MARK } from '../assets/logo.js';

export function LeftNav({ drawerOpen, onToggleDrawer, onNew, onSettings }: {
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  onNew: () => void;
  onSettings: () => void;
}) {
  const { postMessage, preview } = useStore();

  return (
    <nav className="znav">
      <img src={ZOLTTRAN_MARK} alt="Zolttran" className="znav-logo" draggable={false} />
      <div className="znav-group">
        <NavBtn icon={Sparkles} label="Yeni oturum" onClick={onNew} />
        <NavBtn icon={Activity} label="Canlı süreç" active={drawerOpen} onClick={onToggleDrawer} />
        <NavBtn icon={Play} label="Önizlemeyi çalıştır" active={preview.running} onClick={() => postMessage({ type: 'run-preview' })} />
        <NavBtn icon={Hammer} label="Derle & yayınla" onClick={() => { if (!drawerOpen) onToggleDrawer(); }} />
      </div>
      <div className="znav-spacer" />
      <NavBtn icon={Settings} label="Provider'lar & ayarlar" onClick={onSettings} />
    </nav>
  );
}

function NavBtn({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button className={`znav-btn ${active ? 'active' : ''}`} onClick={onClick} title={label} aria-label={label}>
      <Icon size={19} strokeWidth={1.75} />
      <span className="znav-tip">{label}</span>
    </button>
  );
}
