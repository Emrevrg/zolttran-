import React, { useState, useRef, useEffect } from 'react';
import { Zap, ChevronDown } from 'lucide-react';
import { useStore } from '../store.js';
import { getAllProviders } from '../../providers/provider-registry.js';
import type { ProviderID } from '../../types/index.js';

export function ModelSelector() {
  const { activeProviderId, activeModelId, freeMode, setActiveProvider } = useStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const providers = getAllProviders().filter((p) => p.enabled);
  const currentProvider = providers.find((p) => p.id === activeProviderId);
  const currentModel = currentProvider?.models.find((m) => m.id === activeModelId);
  const isAuto = activeModelId === 'auto';
  const displayName = isAuto ? 'Otomatik' : (currentModel?.name ?? activeModelId);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const filtered = providers.flatMap((p) =>
    p.models
      .filter((m) => {
        if (freeMode && m.tier === 'premium') return false;
        const q = search.toLowerCase();
        return !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
      })
      .map((m) => ({ m, p }))
  ).slice(0, 50);

  const tierBadge = (tier: string) => {
    if (tier === 'free')  return <span className="zbadge zbadge-free zsm">FREE</span>;
    if (tier === 'local') return <span className="zbadge zbadge-local zsm">LOCAL</span>;
    return <span className="zbadge zbadge-premium zsm">PRO</span>;
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="zbtn zbtn-ghost zsm"
        style={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={`${currentProvider?.name ?? ''} / ${displayName}`}>
        {isAuto && <Zap size={13} strokeWidth={2} style={{ color: 'var(--z-accent)', flexShrink: 0 }} />}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
        <ChevronDown size={13} strokeWidth={2} style={{ opacity: 0.5, flexShrink: 0 }} />
      </button>

      {open && (
        <div className="glass z-slide-up"
          style={{ position: 'absolute', bottom: '100%', marginBottom: 4, left: 0, zIndex: 100, width: 280, borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
          <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <input autoFocus type="text" placeholder="Model ara…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="zinput" style={{ fontSize: 12 }} />
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto', padding: '4px 0' }}>
            <button className="w-full text-left px-3 py-1.5 hover:bg-white/5 flex items-center gap-2 zsm"
              onClick={() => { setActiveProvider(activeProviderId, 'auto'); setOpen(false); }}>
              <Zap size={13} strokeWidth={2} style={{ color: 'var(--z-accent)' }} />
              <span>Otomatik (Akıllı Yönlendirme)</span>
            </button>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }} />
            {filtered.map(({ m, p }) => (
              <button key={`${p.id}::${m.id}`}
                className="w-full text-left px-3 py-1.5 hover:bg-white/5 flex items-center justify-between zsm"
                style={{ color: m.id === activeModelId && p.id === activeProviderId ? 'var(--z-primary)' : 'inherit' }}
                onClick={() => { setActiveProvider(p.id as ProviderID, m.id); setOpen(false); setSearch(''); }}>
                <div className="flex items-center gap-2 min-w-0">
                  {tierBadge(m.tier)}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                </div>
                <span className="zxs zmuted flex-shrink-0 ml-1">{p.name}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="zsm zmuted text-center py-4">Sonuç bulunamadı</div>}
          </div>
        </div>
      )}
    </div>
  );
}
