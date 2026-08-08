import React, { useRef } from 'react';
import { useStore } from '../store.js';

export function GamePreview() {
  const { preview, postMessage } = useStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      {/* Preview area */}
      <div className="glass-muted" style={{ flex: 1, borderRadius: 10, overflow: 'hidden', position: 'relative', minHeight: 200 }}>
        {preview.running && preview.url ? (
          <iframe ref={iframeRef} src={preview.url} title="Zolttran Preview"
            style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-forms" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 40 }}>🎮</div>
            <div style={{ fontSize: 13 }}>Oyun çalışmıyor</div>
            <div style={{ fontSize: 11 }}>Build et, sonra ▶ Başlat'a tıkla</div>
          </div>
        )}

        {/* Metrics overlay */}
        {preview.running && (
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
            {preview.fps !== undefined && (
              <span className="zxs" style={{ background: 'rgba(0,0,0,0.6)', padding: '2px 7px', borderRadius: 4, color: 'rgba(255,255,255,0.7)' }}>
                {preview.fps} FPS
              </span>
            )}
            {preview.memoryMb !== undefined && (
              <span className="zxs" style={{ background: 'rgba(0,0,0,0.6)', padding: '2px 7px', borderRadius: 4, color: 'rgba(255,255,255,0.7)' }}>
                {preview.memoryMb} MB
              </span>
            )}
            {preview.wsConnected && (
              <span className="zxs zdot-connected" style={{ background: 'rgba(0,0,0,0.6)', padding: '2px 7px', borderRadius: 4, color: 'var(--z-success)' }}>
                ● Canlı
              </span>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {!preview.running ? (
          <button className="zbtn zbtn-primary zsm" onClick={() => postMessage({ type: 'run-preview' })}>
            ▶ Başlat
          </button>
        ) : (
          <button className="zbtn zbtn-ghost zsm" onClick={() => postMessage({ type: 'stop-preview' })}>
            ⏹ Durdur
          </button>
        )}
        <button className="zbtn zbtn-ghost zsm" disabled={!preview.running}
          onClick={() => postMessage({ type: 'reload-preview' })}>
          🔄 Yenile
        </button>
        {preview.url && (
          <a href={preview.url} target="_blank" rel="noopener noreferrer"
            className="zbtn zbtn-ghost zsm ml-auto" style={{ textDecoration: 'none' }}>
            ↗ Tarayıcıda Aç
          </a>
        )}
      </div>
    </div>
  );
}
