/**
 * LeftNav — dar dikey ikon navigasyonu. Studio'nun 3 bölgesi arasında geçiş +
 * hızlı eylemler. Emoji yok; ince çizgi ikonlar.
 */
import React from 'react';
import { Sparkles, MessageSquare, MonitorPlay, ListTree, Play, Settings, FolderClock, type LucideIcon } from 'lucide-react';
import { useStore } from '../store.js';
import { ZOLTTRAN_MARK } from '../assets/logo.js';
import type { Tab } from '../Studio.js';

export function LeftNav({ tab, onTab, onNew, onProjects, onSettings }: {
  tab: Tab;
  onTab: (t: Tab) => void;
  onNew: () => void;
  onProjects: () => void;
  onSettings: () => void;
}) {
  const { postMessage, preview, projects } = useStore();

  return (
    <nav className="znav">
      <img src={ZOLTTRAN_MARK} alt="Zolttran" className="znav-logo" draggable={false} />
      <div className="znav-group">
        <NavBtn icon={Sparkles} label="Yeni oturum" onClick={onNew} />
        <NavBtn icon={MessageSquare} label="Sohbet" active={tab === 'chat'} onClick={() => onTab('chat')} />
        <NavBtn icon={FolderClock} label={`Projelerim${projects.length ? ` (${projects.length})` : ''}`} onClick={onProjects} />
        <NavBtn icon={MonitorPlay} label="Oyun sahnesi" active={tab === 'stage'} onClick={() => onTab('stage')} />
        <NavBtn icon={ListTree} label="Varlıklar & derleme" active={tab === 'inspect'} onClick={() => onTab('inspect')} />
        <NavBtn icon={Play} label="Önizlemeyi çalıştır" active={preview.running} onClick={() => { postMessage({ type: 'run-preview' }); onTab('stage'); }} />
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
