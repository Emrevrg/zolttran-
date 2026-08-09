/**
 * ProvidersSheet — sağdan açılan tek ayar yüzeyi.
 * Tesana felsefesi: kullanıcı SADECE provider bağlar; gerisini AI halleder.
 */
import React, { useState } from 'react';
import { X, Zap, FolderCog, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useStore } from '../store.js';
import { getAllProviders } from '../../providers/provider-registry.js';
import type { ProviderID } from '../../types/index.js';

export function ProvidersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { freeMode, setFreeMode, providerStatuses, postMessage, godotDetectedPath, godotDetectedVersion } = useStore();
  const [keys, setKeys] = useState<Partial<Record<ProviderID, string>>>({});
  const [testing, setTesting] = useState<ProviderID | null>(null);
  const [search, setSearch] = useState('');

  const all = getAllProviders();
  const providers = all.filter(
    (p) => p.authType === 'api-key' && (!search || p.name.toLowerCase().includes(search.toLowerCase())),
  );
  // Gerçek sayılar — registry'den hesaplanır, sabit/uydurma değil
  const freeModelCount = all.reduce((n, p) => n + p.models.filter((m) => m.tier === 'free').length, 0);

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
            <div style={{ fontWeight: 700, fontSize: 15 }}>Provider'lar</div>
            <div className="zxs zmuted">Bağla ve unut — AI en uygun modeli kendi seçer.</div>
          </div>
          <button className="zsheet-x" onClick={onClose} title="Kapat"><X size={16} strokeWidth={1.75} /></button>
        </header>

        <div className="zsheet-body">
          {/* FREE MODE */}
          <div className="glass" style={{ padding: '14px 16px' }}>
            <div className="flex items-center justify-between">
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-1.5" style={{ fontWeight: 600, fontSize: 14 }}><Zap size={15} strokeWidth={1.75} style={{ color: 'var(--z-success)' }} /> FREE MODE</div>
                <div className="zsm zmuted" style={{ marginTop: 2 }}>API anahtarı olmadan {freeModelCount} ücretsiz model, otomatik rotasyon.</div>
                {freeMode && <div className="zsm flex items-center gap-1" style={{ color: 'var(--z-success)', marginTop: 6 }}><CheckCircle2 size={12} strokeWidth={2} /> Aktif — Maliyet $0.00</div>}
              </div>
              <label className="ztoggle" style={{ flexShrink: 0 }}>
                <input type="checkbox" checked={freeMode} onChange={(e) => setFreeMode(e.target.checked)} />
                <div className="ztoggle-track" />
                <div className="ztoggle-thumb" />
              </label>
            </div>
          </div>

          {/* Godot — otonom; kullanıcı yol girmez */}
          <div className="glass-muted flex items-center gap-2" style={{ padding: '12px 14px' }}>
            <FolderCog size={15} strokeWidth={1.75} style={{ color: godotDetectedPath ? 'var(--z-success)' : 'var(--z-txt-2)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Zolttran Engine</div>
              <div className="zxs zmuted">
                {godotDetectedPath
                  ? 'Gömülü oyun motoru hazır — otomatik yönetiliyor'
                  : 'İlk derlemede motor otomatik hazırlanır. Sen hiç uğraşmazsın.'}
              </div>
            </div>
            {godotDetectedPath && <CheckCircle2 size={16} strokeWidth={2} style={{ color: 'var(--z-success)', flexShrink: 0 }} />}
          </div>

          {/* Provider search */}
          <div className="flex items-center gap-2">
            <div className="zsec-head" style={{ margin: 0, flex: 1 }}>API Anahtarları</div>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara…" className="zinput" style={{ width: 130, padding: '4px 8px', fontSize: 11 }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {providers.map((provider) => {
              const status = providerStatuses[provider.id as ProviderID];
              const isTesting = testing === provider.id;
              return (
                <div key={provider.id} className="glass-muted" style={{ padding: '14px 15px' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 9 }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{provider.name}</span>
                      {freeMode && provider.hasFreeModels && <span className="zbadge zbadge-free">FREE</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {status === 'connected' && <span className="zxs flex items-center gap-1" style={{ color: 'var(--z-success)' }}><CheckCircle2 size={12} strokeWidth={2} /> Bağlı</span>}
                      {status === 'error' && <span className="zxs flex items-center gap-1" style={{ color: 'var(--z-danger)' }}><XCircle size={12} strokeWidth={2} /> Hata</span>}
                      <button className="zbtn-link zxs flex items-center gap-1" disabled={isTesting}
                        onClick={() => test(provider.id as ProviderID)}>
                        {isTesting ? <><Loader2 size={12} strokeWidth={2} className="z-spin" /> Test…</> : 'Test'}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input type="password" value={keys[provider.id as ProviderID] ?? ''}
                      onChange={(e) => setKeys((p) => ({ ...p, [provider.id]: e.target.value }))}
                      placeholder={provider.apiKeyEnv ? `${provider.apiKeyEnv}…` : 'Anahtar gerekmez'}
                      disabled={!provider.apiKeyEnv} className="zinput font-mono" style={{ fontSize: 11 }} />
                    {provider.apiKeyEnv && (
                      <button className="zbtn zbtn-ghost flex-shrink-0 zsm" style={{ padding: '4px 12px' }}
                        disabled={!keys[provider.id as ProviderID]?.trim()}
                        onClick={() => save(provider.id as ProviderID)}>Kaydet</button>
                    )}
                  </div>
                  <div className="zxs zmuted" style={{ marginTop: 5 }}>
                    {provider.models.length} model
                    {freeMode && provider.hasFreeModels ? ` · ${provider.models.filter((m) => m.tier === 'free').length} ücretsiz` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
