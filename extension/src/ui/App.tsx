/**
 * Zolttran Root — tesana tarzı: dar sol ikon nav + tek konuşma yüzeyi +
 * istenince açılan sağ süreç çekmecesi. Mod/sekme yok, emoji yok.
 */
import React, { useEffect, useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from './store.js';
import { Studio } from './Studio.js';
import { LeftNav } from './components/LeftNav.js';
import { LiveRail } from './panels/LiveRail.js';
import { ProvidersSheet } from './components/ProvidersSheet.js';
import type { ExtensionToWebview } from '../types/index.js';

export default function App() {
  const {
    toasts, removeToast, clearMessages,
    hydrate, addMessage, updateStreamChunk, finalizeStream,
    upsertTask, setBuildResult, setPreview, setIsBuildingAll,
    setGodotConnected, setProviderStatus, setStreaming,
    addToast, postMessage, setOrchestratorMode,
  } = useStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleMessage = useCallback((event: MessageEvent<ExtensionToWebview>) => {
    const msg = event.data;
    switch (msg.type) {
      case 'state-update':   hydrate(msg.payload); break;
      case 'chat-response':  addMessage(msg.payload.message); if (!msg.payload.streaming) setStreaming(false); break;
      case 'chat-stream-chunk':
        if (msg.payload.done) finalizeStream(useStore.getState().currentStreamContent);
        else { updateStreamChunk(msg.payload.chunk); setStreaming(true); }
        break;
      case 'agent-update':    upsertTask(msg.payload.task); setDrawerOpen(true); break;
      case 'build-update':    setBuildResult(msg.payload.result); if (msg.payload.result.status !== 'building') setIsBuildingAll(false); break;
      case 'preview-update':  setPreview(msg.payload.state); break;
      case 'godot-status':    setGodotConnected(msg.payload.connected, msg.payload.method); break;
      case 'provider-status': setProviderStatus(msg.payload.providerId, msg.payload.status === 'ok' ? 'connected' : 'error'); break;
      case 'toast':           addToast({ message: msg.payload.message, type: msg.payload.type, duration: msg.payload.duration }); break;
      case 'notification':    addToast({ message: msg.payload.message, type: msg.payload.level === 'error' ? 'error' : msg.payload.level === 'warn' ? 'warning' : 'info', duration: 4000 }); break;
      case 'error':           addToast({ message: msg.payload.message, type: 'error', duration: 6000 }); break;
    }
  }, [hydrate, addMessage, updateStreamChunk, finalizeStream, upsertTask, setBuildResult,
      setPreview, setIsBuildingAll, setGodotConnected, setProviderStatus, setStreaming, addToast]);

  useEffect(() => {
    window.addEventListener('message', handleMessage as EventListener);
    postMessage({ type: 'ready' });
    setOrchestratorMode('orchestrator');
    return () => window.removeEventListener('message', handleMessage as EventListener);
  }, [handleMessage, postMessage, setOrchestratorMode]);

  const onNew = () => { clearMessages(); setDrawerOpen(false); };

  return (
    <div className="zapp">
      <LeftNav
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen((v) => !v)}
        onNew={onNew}
        onSettings={() => setSheetOpen(true)}
      />

      <main className="zmain">
        <Studio onOpenDrawer={() => setDrawerOpen(true)} onOpenProviders={() => setSheetOpen(true)} />
      </main>

      {/* Right process drawer — istenince açılır, kalıcı değil */}
      <div className={`zdrawer ${drawerOpen ? 'open' : ''}`} role="complementary" aria-hidden={!drawerOpen}>
        <div className="zdrawer-scrim" onClick={() => setDrawerOpen(false)} />
        <div className="zdrawer-panel">
          <div className="zdrawer-head">
            <span className="zdrawer-title">Canlı Süreç</span>
            <button className="zicon-btn" onClick={() => setDrawerOpen(false)} title="Kapat"><X size={16} strokeWidth={1.75} /></button>
          </div>
          <LiveRail onOpenProviders={() => setSheetOpen(true)} />
        </div>
      </div>

      <ProvidersSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />

      {toasts.length > 0 && (
        <div className="ztoast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`ztoast ztoast-${t.type} z-slide-up`} onClick={() => removeToast(t.id)} style={{ cursor: 'pointer' }}>
              <span className="flex-1">{t.message}</span>
              <X size={13} strokeWidth={2} style={{ opacity: 0.5 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
