/**
 * ProvidersSheet — sağdan açılan tek ayar yüzeyi.
 * Kullanıcı provider bağlar, istediğinde modeli kendi seçer ya da AI'a bırakır;
 * FREE modda bazı provider'ları rotasyondan çıkarabilir.
 */
import React, { useState } from 'react';
import { X, Zap, Loader2, CheckCircle2, XCircle, Cpu, Check } from 'lucide-react';
import { useStore } from '../store.js';
import { getAllProviders } from '../../providers/provider-registry.js';
import type { ProviderID } from '../../types/index.js';

export function ProvidersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    freeMode, setFreeMode, providerStatuses, postMessage,
    godotDetectedPath, freeExcluded, toggleFreeExclusion,
    activeProviderId, activeModelId, setActiveProvider,
  } = useStore();
  const [keys, setKeys] = useState<Partial<Record<ProviderID, string>>>({});
  const [testing, setTesting] = useState<ProviderID | null>(null);
  const [search, setSearch] = useState('');

  const all = getAllProviders();
  const providers = all.filter(
    (p) => p.authType === 'api-key' && (!search || p.name.toLowerCase().includes(search.toLowerCase())),
  );

  const save = (id: ProviderID) => {
    const key = keys[id];
    if (!key?.trim()) return;
    postMessage({ type: 'set-api-key', payload: { providerId: id, key } });
  };
  const test = (id: ProviderID) => {
    setTesting(id);
    postMessage({ type: 'test-provider', payload: { providerId: id } });
    setTimeout(() => setTesting(null), 6000);
  };

  return (
    <>
      <div className={`zsheet-scrim ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`zsheet ${open ? 'open' : ''}`}>
        <header className="zsheet-head">
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Sağlayıcılar & Modeller</div>
            <div className="zxs zmuted">Bağla, dilersen modeli sen seç — ya da AI'a bırak.</div>
          </div>
          <button className="zsheet-x" onClick={onClose} title="Kapat"><X size={16} strokeWidth={1.75} /></button>
        </header>

        <div className="zsheet-body">
          {/* FREE MODE */}
          <div className="glass" style={{ padding: '14px 16px' }}>
            <div className="flex items-center justify-between">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-1.5" style={{ fontWeight: 600, fontSize: 14 }}><Zap size={15} strokeWidth={1.75} style={{ color: 'var(--z-success)' }} /> FREE MODE</div>
                <div className="zsm zmuted" style={{ marginTop: 2 }}>Anahtarsız ücretsiz modeller, otomatik rotasyon.</div>
                {freeMode && <div className="zsm flex items-center gap-1" style={{ color: 'var(--z-success)', marginTop: 6 }}><CheckCircle2 size={12} strokeWidth={2} /> Aktif — Maliyet $0.00</div>}
              </div>
              <label className="ztoggle" style={{ flexShrink: 0 }}>
                <input type="checkbox" checked={freeMode} onChange={(e) => setFreeMode(e.target.checked)} />
                <div className="ztoggle-track" />
                <div className="ztoggle-thumb" />
              </label>
            </div>
          </div>

          {/* Zolttran Engine — otonom */}
          <div className="glass-muted flex items-center gap-2" style={{ padding: '12px 14px' }}>
            <Cpu size={15} strokeWidth={1.75} style={{ color: godotDetectedPath ? 'var(--z-success)' : 'var(--z-txt-2)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Zolttran Engine</div>
              <div className="zxs zmuted">
                {godotDetectedPath ? 'Gömülü oyun motoru hazır — otomatik yönetiliyor' : 'İlk derlemede motor otomatik hazırlanır. Sen hiç uğraşmazsın.'}
              </div>
            </div>
            {godotDetectedPath && <CheckCircle2 size={16} strokeWidth={2} style={{ color: 'var(--z-success)', flexShrink: 0 }} />}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="zsec-head" style={{ margin: 0, flex: 1 }}>Sağlayıcılar</div>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara…" className="zinput" style={{ width: 130, padding: '4px 8px', fontSize: 11 }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {providers.map((provider) => {
              const pid = provider.id as ProviderID;
              const status = providerStatuses[pid];
              const isTesting = testing === provider.id;
              const isActive = activeProviderId === pid && activeModelId !== 'auto';
              const excluded = freeExcluded.includes(pid);
              const selectVal = activeProviderId === pid ? activeModelId : '';
              return (
                <div key={provider.id} className="zprovider" style={{ outline: isActive ? '1px solid var(--z-primary-bdr)' : 'none' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                    <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{provider.name}</span>
                      {isActive && <span className="zbadge zbadge-premium" style={{ fontSize: 9 }}>AKTİF</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {status === 'connected' && <span className="zxs flex items-center gap-1" style={{ color: 'var(--z-success)' }}><CheckCircle2 size={12} strokeWidth={2} /> Bağlı</span>}
                      {status === 'error' && <span className="zxs flex items-center gap-1" style={{ color: 'var(--z-danger)' }}><XCircle size={12} strokeWidth={2} /> Hata</span>}
                      <button className="zbtn-link zxs flex items-center gap-1" disabled={isTesting}
                        onClick={() => test(pid)}>
                        {isTesting ? <><Loader2 size={12} strokeWidth={2} className="z-spin" /> Test…</> : 'Test'}
                      </button>
                    </div>
                  </div>

                  {/* Model seçici — kendi modelini seç ya da AI'a bırak */}
                  <label className="zfield-label">Model</label>
                  <select className="zselect" value={selectVal}
                    onChange={(e) => setActiveProvider(pid, e.target.value || 'auto')}>
                    <option value="auto">Otomatik — AI en uygununu seçer</option>
                    {provider.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}{m.tier === 'free' ? '  · ücretsiz' : m.tier === 'local' ? '  · yerel' : '  · pro'}
                      </option>
                    ))}
                  </select>

                  {/* API anahtarı */}
                  {provider.apiKeyEnv && (
                    <div className="flex gap-2" style={{ marginTop: 8 }}>
                      <input type="password" value={keys[pid] ?? ''}
                        onChange={(e) => setKeys((p) => ({ ...p, [provider.id]: e.target.value }))}
                        placeholder={`${provider.apiKeyEnv}…`}
                        className="zinput font-mono" style={{ fontSize: 11 }} />
                      <button className="zbtn zbtn-ghost flex-shrink-0 zsm" style={{ padding: '4px 12px' }}
                        disabled={!keys[pid]?.trim()} onClick={() => save(pid)}>Kaydet</button>
                    </div>
                  )}

                  {/* FREE rotasyonundan hariç tut (sadece free mod açıkken) */}
                  {freeMode && provider.hasFreeModels && (
                    <button className="zfree-row" onClick={() => toggleFreeExclusion(pid)}>
                      <span className={`zcheck ${excluded ? '' : 'on'}`}>{!excluded && <Check size={11} strokeWidth={3} />}</span>
                      <span className="zsm" style={{ color: excluded ? 'var(--z-txt-3,rgba(255,255,255,.45))' : 'var(--z-txt-2)' }}>
                        {excluded ? 'FREE rotasyonuna dahil değil' : 'FREE rotasyonuna dahil'}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
