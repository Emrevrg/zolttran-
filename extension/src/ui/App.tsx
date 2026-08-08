/**
 * Zolttran Root App — webview message bridge + tab routing + toast system.
 */
import React, { useEffect, useCallback } from 'react';
import { useStore } from './store.js';
import { ChatPanel }        from './panels/ChatPanel.js';
import { AgentPanel }       from './panels/AgentPanel.js';
import { GameBuilderPanel } from './panels/GameBuilderPanel.js';
import { DeployPanel }      from './panels/DeployPanel.js';
import { SettingsPanel }    from './panels/SettingsPanel.js';
import type { ExtensionToWebview, PanelTab } from '../types/index.js';

const TABS: Array<{ id: PanelTab; label: string; icon: string }> = [
  { id: 'chat',     label: 'Chat',    icon: '💬' },
  { id: 'agent',    label: 'Agents',  icon: '🤖' },
  { id: 'builder',  label: 'Builder', icon: '🎮' },
  { id: 'deploy',   label: 'Deploy',  icon: '🚀' },
  { id: 'settings', label: 'Config',  icon: '⚙️' },
];

export default function App() {
  const {
    ready, activeTab, setActiveTab,
    toasts, removeToast,
    hydrate, addMessage, updateStreamChunk, finalizeStream,
    upsertTask, setBuildResult, setPreview, setIsBuildingAll,
    setGodotConnected, setCost, setProviderStatus, setStreaming,
    setCurrentGdd, setCurrentProject,
    addToast, postMessage,
  } = useStore();

  // -------------------------------------------------------------------------
  // Message bridge: extension → webview
  // -------------------------------------------------------------------------
  const handleMessage = useCallback((event: MessageEvent<ExtensionToWebview>) => {
    const msg = event.data;
    switch (msg.type) {
      case 'state-update':
        hydrate(msg.payload);
        break;
      case 'chat-response':
        if (!msg.payload.streaming) { addMessage(msg.payload.message); setStreaming(false); }
        break;
      case 'chat-stream-chunk':
        if (msg.payload.done) {
          finalizeStream(useStore.getState().currentStreamContent);
        } else {
          updateStreamChunk(msg.payload.chunk);
          setStreaming(true);
        }
        break;
      case 'agent-update':   upsertTask(msg.payload.task);                                                                          break;
      case 'build-update':   setBuildResult(msg.payload.result); if (msg.payload.result.status !== 'building') setIsBuildingAll(false); break;
      case 'preview-update': setPreview(msg.payload.state);                                                                         break;
      case 'godot-status':   setGodotConnected(msg.payload.connected, msg.payload.method);                                         break;
      case 'provider-status':setProviderStatus(msg.payload.providerId, msg.payload.status === 'ok' ? 'connected' : 'error');        break;
      case 'toast':          addToast({ message: msg.payload.message, type: msg.payload.type, duration: msg.payload.duration });    break;
      case 'notification':
        addToast({ message: msg.payload.message, type: msg.payload.level === 'error' ? 'error' : msg.payload.level === 'warn' ? 'warning' : 'info', duration: 4000 });
        break;
      case 'error':
        addToast({ message: `❌ ${msg.payload.message}`, type: 'error', duration: 6000 });
        break;
    }
  }, [hydrate, addMessage, updateStreamChunk, finalizeStream, upsertTask, setBuildResult,
      setPreview, setIsBuildingAll, setGodotConnected, setProviderStatus, setStreaming,
      setCurrentGdd, setCurrentProject, addToast]);

  useEffect(() => {
    window.addEventListener('message', handleMessage as EventListener);
    postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', handleMessage as EventListener);
  }, [handleMessage, postMessage]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen select-none" style={{ fontSize: 13 }}>
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(124,106,247,0.15)', background: 'rgba(124,106,247,0.04)' }}>
        <div className="flex items-center gap-2">
          {/* Logo mark */}
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg,#7c6af7,#22d3ee)', color: '#fff', fontSize: 11, letterSpacing: '-0.5px' }}>
            Z
          </div>
          <span className="font-bold tracking-tight zgrad" style={{ fontSize: 13, letterSpacing: '-0.3px' }}>
            ZOLTTRAN
          </span>
        </div>
        <div className="flex items-center gap-2 zsm zmuted">
          {ready ? (
            <span className="flex items-center gap-1.5">
              <span className="zdot zdot-connected" />
              Hazır
            </span>
          ) : (
            <span className="flex items-center gap-1.5 z-fade-in">
              <span className="zdot zdot-warning" />
              Bağlanıyor...
            </span>
          )}
        </div>
      </header>

      {/* ── Tab bar ── */}
      <nav className="ztab-bar flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`ztab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Panel ── */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'chat'     && <ChatPanel />}
        {activeTab === 'agent'    && <AgentPanel />}
        {activeTab === 'builder'  && <GameBuilderPanel />}
        {activeTab === 'deploy'   && <DeployPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>

      {/* ── Toast container ── */}
      {toasts.length > 0 && (
        <div className="ztoast-container">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`ztoast ztoast-${toast.type} z-slide-up`}
              onClick={() => removeToast(toast.id)}
              style={{ cursor: 'pointer' }}
              title="Kapat"
            >
              <span className="flex-1">{toast.message}</span>
              <span className="zmuted zsm flex-shrink-0">✕</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
