import React, { useState } from 'react';
import { useStore } from '../store.js';
import { getAllProviders } from '../../providers/provider-registry.js';
import type { ProviderID } from '../../types/index.js';

export function SettingsPanel() {
  const { freeMode, setFreeMode, providerStatuses, postMessage } = useStore();
  const [keys, setKeys] = useState<Partial<Record<ProviderID, string>>>({});
  const [testing, setTesting] = useState<ProviderID | null>(null);
  const [godotPath, setGodotPath] = useState('godot4');
  const [search, setSearch] = useState('');

  const providers = getAllProviders().filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
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
    <div className="flex flex-col h-full overflow-y-auto px-3 py-3" style={{ gap: 14 }}>
      {/* FREE MODE */}
      <div className="glass" style={{ padding: '14px 16px' }}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>🆓 FREE MODE</div>
            <div className="zsm zmuted mt-1">API anahtarı olmadan 20+ ücretsiz model. Otomatik rotasyon.</div>
            {freeMode && <div className="zsm mt-1.5" style={{ color: 'var(--z-success)' }}>✓ Aktif — Maliyet: $0.00</div>}
          </div>
          <label className="ztoggle" style={{ cursor: 'pointer', flexShrink: 0 }}>
            <input type="checkbox" checked={freeMode} onChange={(e) => setFreeMode(e.target.checked)} />
            <div className="ztoggle-track" />
            <div className="ztoggle-thumb" />
          </label>
        </div>
      </div>

      {/* Godot path */}
      <div className="glass-muted" style={{ padding: '12px 14px', borderRadius: 10 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>⚙️ Godot Yolu</div>
        <div className="flex gap-2">
          <input type="text" value={godotPath} onChange={(e) => setGodotPath(e.target.value)}
            placeholder="godot4 veya /tam/yol/godot4"
            className="zinput font-mono" style={{ fontSize: 12 }} />
          <button className="zbtn zbtn-primary flex-shrink-0" style={{ padding: '6px 14px' }}
            onClick={() => postMessage({ type: 'set-godot-path', payload: { path: godotPath } })}>
            Kaydet
          </button>
        </div>
        <div className="zxs zmuted mt-1.5">Godot 4.3+ gerekli. PATH'e ekli olmalı veya tam yol girilmeli.</div>
      </div>

      {/* API Keys */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="zsec-head" style={{ margin: 0, flex: 1 }}>API Anahtarları ({providers.filter((p) => p.authType === 'api-key').length} provider)</div>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Ara..." className="zinput" style={{ width: 120, padding: '3px 8px', fontSize: 11 }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {providers.filter((p) => p.authType === 'api-key').map((provider) => {
            const status = providerStatuses[provider.id as ProviderID];
            const isTesting = testing === provider.id;
            return (
              <div key={provider.id} className="glass-muted" style={{ padding: '10px 12px', borderRadius: 8 }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{provider.name}</span>
                    {provider.hasFreeModels && <span className="zbadge zbadge-free">FREE</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {status === 'connected' && <span className="zxs" style={{ color: 'var(--z-success)' }}>✓ Bağlı</span>}
                    {status === 'error'     && <span className="zxs" style={{ color: 'var(--z-danger)'  }}>✗ Hata</span>}
                    <button className="zxs zmuted hover:text-white transition-colors" disabled={isTesting}
                      onClick={() => test(provider.id as ProviderID)}>
                      {isTesting ? <span className="z-spin inline-block">⚙</span> : 'Test'}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input type="password"
                    value={keys[provider.id as ProviderID] ?? ''}
                    onChange={(e) => setKeys((p) => ({ ...p, [provider.id]: e.target.value }))}
                    placeholder={provider.apiKeyEnv ? `${provider.apiKeyEnv}…` : 'Anahtar gerekmez'}
                    disabled={!provider.apiKeyEnv}
                    className="zinput font-mono" style={{ fontSize: 11 }} />
                  {provider.apiKeyEnv && (
                    <button className="zbtn zbtn-ghost flex-shrink-0 zsm"
                      style={{ padding: '4px 12px' }}
                      disabled={!keys[provider.id as ProviderID]?.trim()}
                      onClick={() => save(provider.id as ProviderID)}>
                      Kaydet
                    </button>
                  )}
                </div>
                <div className="zxs zmuted mt-1">
                  {provider.models.length} model
                  {provider.hasFreeModels ? ` · ${provider.models.filter((m) => m.tier === 'free').length} ücretsiz` : ' · ücretsiz tier yok'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
