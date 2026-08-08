import React, { useRef, useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore } from '../store.js';
import { ModelSelector } from '../components/ModelSelector.js';
import { FreeModeToggle } from '../components/FreeModeToggle.js';
import { TokenCounter } from '../components/TokenCounter.js';
import type { OrchestratorMode, ChatMessage } from '../../types/index.js';

const MODES: Array<{ id: OrchestratorMode; label: string; icon: string; tip: string }> = [
  { id: 'orchestrator', label: 'Tam Otonom',   icon: '⚡', tip: 'Tüm agent\'ları koordine eder' },
  { id: 'architect',   label: 'Tasarım',       icon: '🏗️', tip: 'Sadece oyun tasarımı' },
  { id: 'code',        label: 'Kod',           icon: '💻', tip: 'Sadece kod yazar' },
  { id: 'debug',       label: 'Debug',         icon: '🔧', tip: 'Hataları düzeltir' },
  { id: 'ask',         label: 'Soru-Cevap',    icon: '💬', tip: 'Bilgi sorar' },
];

const STARTERS = [
  { icon: '🧛', text: 'Vampire Survivors benzeri bilim kurgu oyunu yap' },
  { icon: '🏃', text: 'Wall jump özellikli 2D platform oyunu oluştur' },
  { icon: '⚔️', text: 'NPC diyaloğu olan top-down RPG yap' },
  { icon: '🗡️', text: 'Prosedürel zindan ile roguelike oyun geliştir' },
  { icon: '🌾', text: 'Çiftlik simülasyonu — cozy game tarzı' },
  { icon: '🔫', text: '3D birinci şahıs nişancı oyunu yap' },
];

export function ChatPanel() {
  const { messages, isStreaming, currentStreamContent, orchestratorMode, setOrchestratorMode, postMessage } = useStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isStreaming, currentStreamContent.length]);

  const send = useCallback(() => {
    const content = input.trim();
    if (!content || isStreaming) return;
    postMessage({ type: 'chat-message', payload: { content } });
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [input, isStreaming, postMessage]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const resize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-col h-full" style={{ background: 'transparent' }}>
      {/* Mode selector */}
      <div className="flex items-center gap-1 px-3 py-2 flex-shrink-0 overflow-x-auto"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {MODES.map((m) => (
          <button key={m.id} title={m.tip}
            onClick={() => setOrchestratorMode(m.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md zsm flex-shrink-0 transition-all"
            style={{
              background: orchestratorMode === m.id ? 'rgba(124,106,247,0.2)' : 'transparent',
              border: orchestratorMode === m.id ? '1px solid rgba(124,106,247,0.35)' : '1px solid transparent',
              color: orchestratorMode === m.id ? '#a78bfa' : 'rgba(255,255,255,0.38)',
              fontWeight: orchestratorMode === m.id ? 600 : 400,
            }}>
            <span>{m.icon}</span>
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isEmpty && <WelcomeScreen onStart={(text) => { setInput(text); textareaRef.current?.focus(); }} />}

        {messages.map((msg) => <Bubble key={msg.id} msg={msg} />)}

        {isStreaming && currentStreamContent && (
          <div className="flex gap-2 z-slide-up">
            <Avatar />
            <div className="glass zmd" style={{ flex: 1, padding: '10px 14px', fontSize: 13, maxWidth: '88%', borderRadius: '4px 12px 12px 12px' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentStreamContent}</ReactMarkdown>
              <span className="stream-cursor" />
            </div>
          </div>
        )}

        {isStreaming && !currentStreamContent && (
          <div className="flex gap-2">
            <Avatar />
            <div className="glass" style={{ padding: '10px 14px', borderRadius: '4px 12px 12px 12px' }}>
              <div className="flex gap-1.5 items-center" style={{ height: 16 }}>
                <div className="w-1.5 h-1.5 rounded-full z-bounce-1" style={{ background: 'var(--z-primary)' }} />
                <div className="w-1.5 h-1.5 rounded-full z-bounce-2" style={{ background: 'var(--z-primary)' }} />
                <div className="w-1.5 h-1.5 rounded-full z-bounce-3" style={{ background: 'var(--z-primary)' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 pb-3">
        <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
          <textarea ref={textareaRef} value={input} onChange={resize} onKeyDown={onKey}
            disabled={isStreaming} rows={2}
            placeholder="Hayalindeki oyunu tarif et, soru sor veya hata yapıştır..."
            style={{
              width: '100%', background: 'transparent', padding: '10px 14px',
              fontSize: 13, resize: 'none', outline: 'none', minHeight: 56,
              color: 'var(--vscode-editor-foreground, #ccc)',
              fontFamily: 'var(--vscode-font-family, system-ui)',
            }} />
          <div className="flex items-center gap-2 px-3 pb-2.5">
            <span className="zxs zmuted hidden sm:block">Enter gönder · Shift+Enter yeni satır</span>
            <div className="ml-auto flex items-center gap-1.5 flex-wrap justify-end">
              <TokenCounter />
              <ModelSelector />
              <FreeModeToggle />
              <button onClick={send} disabled={!input.trim() || isStreaming}
                className="zbtn zbtn-primary" style={{ padding: '5px 14px' }}>
                {isStreaming ? <span className="z-spin inline-block">⏳</span> : '↑ Gönder'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className={`flex gap-2 z-slide-up group ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && <Avatar />}
      <div style={{ maxWidth: '88%' }}>
        <div style={{
          padding: '10px 14px', fontSize: 13, lineHeight: 1.65, borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
          background: isUser ? 'rgba(124,106,247,0.22)' : 'rgba(255,255,255,0.04)',
          border: isUser ? '1px solid rgba(124,106,247,0.3)' : '1px solid rgba(255,255,255,0.07)',
        }}>
          {typeof msg.content === 'string' ? (
            <div className="zmd">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                code({ inline, children, ...props }: { inline?: boolean; children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
                  return inline
                    ? <code style={{ background: 'rgba(0,0,0,0.35)', padding: '1px 5px', borderRadius: 4, fontSize: 11.5 }} {...props}>{children}</code>
                    : <pre><code style={{ fontSize: 11.5 }} {...props}>{children}</code></pre>;
                },
              }}>{msg.content}</ReactMarkdown>
            </div>
          ) : <span className="zmuted zsm">[multipart içerik]</span>}
        </div>
        <div className={`flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : ''}`}>
          <span className="zxs zmuted">{new Date(msg.timestamp).toLocaleTimeString('tr-TR')}</span>
          {msg.model && <span className="zxs zmuted">{msg.model}</span>}
          <button onClick={copy} className="zxs zmuted hover:text-white transition-colors">
            {copied ? '✓ Kopyalandı' : 'Kopyala'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-bold"
      style={{ background: 'linear-gradient(135deg,#7c6af7,#22d3ee)', color: '#fff', fontSize: 11, marginTop: 2 }}>
      Z
    </div>
  );
}

function WelcomeScreen({ onStart }: { onStart: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-8 px-4 z-fade-in">
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#7c6af7,#22d3ee)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 8px 32px rgba(124,106,247,0.4)' }}>
        🎮
      </div>
      <div>
        <h1 className="font-bold zgrad" style={{ fontSize: 20, letterSpacing: '-0.5px' }}>Zolttran</h1>
        <p className="zmuted" style={{ fontSize: 13, marginTop: 4 }}>Hayallerini oyuna dönüştür. Tek bir cümleyle.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 320 }}>
        {STARTERS.map((s) => (
          <button key={s.text} onClick={() => onStart(s.text)}
            className="zbtn-ghost text-left transition-all"
            style={{ padding: '8px 12px', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11.5, lineHeight: 1.4 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
            <span style={{ color: 'rgba(255,255,255,0.65)' }}>{s.text}</span>
          </button>
        ))}
      </div>
      <p className="zxs zmuted">FREE MODE ile API anahtarı olmadan başlayın</p>
    </div>
  );
}
