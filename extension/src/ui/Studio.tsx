/**
 * Studio — tek konuşma yüzeyi. Sol ikon nav + bu yüzey + istenince sağ çekmece.
 * Emoji yok; ince Lucide ikonlar. Kullanıcı konuşur, AI oyunu kurar.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Gamepad2, ArrowUp, PanelRight, Skull, Footprints, Swords, Dices, Sprout, Crosshair,
  Copy, Check, Paperclip, type LucideIcon,
} from 'lucide-react';
import { useStore } from './store.js';
import { ModelSelector } from './components/ModelSelector.js';
import { AttachmentStrip, classifyFile } from './components/attachments.js';
import { ImageLightbox } from './components/ImageLightbox.js';
import { ModelViewer } from './components/ModelViewer.js';
import { ZOLTTRAN_MARK } from './assets/logo.js';
import type { ChatMessage, Attachment } from '../types/index.js';

const STARTERS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Skull,     title: 'Vampire Survivors', text: 'Vampire Survivors benzeri, bilim kurgu temalı bir bullet-heaven oyunu yap' },
  { icon: Footprints,title: '2D Platformer',    text: 'Wall-jump ve dash özellikli, akıcı bir 2D platform oyunu oluştur' },
  { icon: Swords,    title: 'Top-down RPG',      text: 'NPC diyalogları ve envanter sistemi olan top-down bir RPG yap' },
  { icon: Dices,     title: 'Roguelike',        text: 'Prosedürel zindanlar ve kalıcı ölüm içeren bir roguelike geliştir' },
  { icon: Sprout,    title: 'Cozy Çiftlik',      text: 'Ekim, hasat ve gün döngüsü olan cozy bir çiftlik simülasyonu yap' },
  { icon: Crosshair, title: '3D FPS',            text: '3D birinci şahıs nişancı — dalga bazlı düşmanlarla arena modu' },
];

export function Studio({ onOpenDrawer, onOpenProviders }: { onOpenDrawer: () => void; onOpenProviders: () => void }) {
  const { messages, isStreaming, currentStreamContent, ready, freeMode, costToday, godotConnected, postMessage, addMessage, setStreaming } = useStore();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [viewer, setViewer] = useState<Attachment | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isStreaming, currentStreamContent.length]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files).map(classifyFile);
    if (list.length) setAttachments((prev) => [...prev, ...list]);
  }, []);

  const removeAtt = (id: string) => setAttachments((prev) => prev.filter((a) => a.id !== id));

  const openAtt = (a: Attachment) => { if (a.kind === 'image' || a.kind === 'model') setViewer(a); };

  const send = useCallback((buildGame = false) => {
    const content = input.trim();
    if ((!content && attachments.length === 0) || isStreaming) return;
    // Optimistik kullanıcı mesajı — ekler webview içi objectURL ile önizlenir
    addMessage({
      id: crypto.randomUUID(), role: 'user', content, timestamp: Date.now(),
      attachments: attachments.length ? attachments : undefined,
    });
    setStreaming(true);
    const attNames = attachments.map((a) => a.name);
    if (buildGame) postMessage({ type: 'new-game', payload: { prompt: content, gameType: 'custom' } });
    else postMessage({ type: 'chat-message', payload: { content, attachments: attNames } });
    setInput('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [input, attachments, isStreaming, postMessage, addMessage, setStreaming]);

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(false); } };
  const resize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };
  const pick = (text: string) => { setInput(text); textareaRef.current?.focus(); };

  const isEmpty = messages.length === 0 && !isStreaming;

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isStreaming;
  const composer = (big: boolean) => (
    <div className={`zcomposer ${dragOver ? 'dragging' : ''}`} style={big ? { maxWidth: 680, width: '100%', margin: '0 auto' } : undefined}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}>
      {attachments.length > 0 && (
        <div className="zcomposer-atts">
          <AttachmentStrip items={attachments} removable onRemove={removeAtt} onOpen={openAtt} />
        </div>
      )}
      <textarea ref={textareaRef} value={input} onChange={resize} onKeyDown={onKey}
        onPaste={(e) => { const f = Array.from(e.clipboardData.files); if (f.length) { e.preventDefault(); addFiles(f); } }}
        disabled={isStreaming} rows={big ? 3 : 2}
        placeholder={dragOver ? 'Bırak — dosyayı ekle' : 'Hayalindeki oyunu tarif et — AI tasarlar, kodlar, çizer ve derler.'}
        style={{
          width: '100%', background: 'transparent', padding: '13px 15px',
          fontSize: 13.5, resize: 'none', outline: 'none', minHeight: big ? 74 : 52,
          color: 'var(--vscode-editor-foreground,#e6e6ee)', fontFamily: 'inherit', lineHeight: 1.5,
        }} />
      <div className="zcomposer-bar">
        <input ref={fileRef} type="file" multiple hidden
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
        <button className="zicon-btn" title="Dosya ekle (görsel · 3D · her tür)" onClick={() => fileRef.current?.click()}>
          <Paperclip size={16} strokeWidth={1.75} />
        </button>
        <ModelSelector />
        <span className="zxs zmuted hidden-sm" style={{ marginLeft: 2 }}>Enter · gönder</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => send(true)} disabled={!canSend}
            className="zbtn zbtn-ghost zsm" title="Tam oyun pipeline'ı olarak kur">
            <Gamepad2 size={14} strokeWidth={1.75} /> Oyunu Kur
          </button>
          <button onClick={() => send(false)} disabled={!canSend}
            className="zbtn zbtn-primary" title="Gönder" style={{ padding: '7px 10px' }}>
            <ArrowUp size={16} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="zstudio">
      {/* slim top bar */}
      <div className="ztopbar">
        <span className="zbrand">
          <span className="zbrand-name zgrad">ZOLTTRAN</span>
          <span className="zbrand-sub">AI GAME STUDIO</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="zstat"><span className={`zdot ${ready ? 'zdot-connected' : 'zdot-warning'}`} />{ready ? 'Hazır' : 'Bağlanıyor'}</span>
          <span className="zstat"><Gamepad2 size={13} strokeWidth={1.75} style={{ opacity: godotConnected ? 1 : 0.4 }} />{godotConnected ? 'Godot' : 'Godot ✕'}</span>
          {freeMode
            ? <span className="zchip zchip-free">FREE</span>
            : <span className="zstat">${costToday.toFixed(3)}</span>}
          <button className="zicon-btn" onClick={onOpenDrawer} title="Canlı süreç"><PanelRight size={16} strokeWidth={1.75} /></button>
        </div>
      </div>

      <div className="zconvo">
        {isEmpty ? (
          <div className="zhero">
            <img src={ZOLTTRAN_MARK} alt="Zolttran" className="zhero-logo" draggable={false} />
            <h1 className="zhero-title">Ne inşa edelim?</h1>
            <p className="zhero-sub">Tek bir cümle yaz — Zolttran tasarımdan derlemeye kadar her şeyi kendi halleder.</p>
            {composer(true)}
            <div className="zstarters">
              {STARTERS.map((s) => {
                const Icon = s.icon;
                return (
                  <button key={s.title} className="zstarter" onClick={() => pick(s.text)}>
                    <span className="zstarter-ic"><Icon size={16} strokeWidth={1.75} /></span>
                    <div style={{ minWidth: 0 }}>
                      <div className="zsm" style={{ fontWeight: 600 }}>{s.title}</div>
                      <div className="zxs zmuted zclamp">{s.text}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="zxs zmuted zhero-foot">
              <button className="zlink" onClick={onOpenProviders}>Provider bağla</button> ya da FREE MODE ile anahtarsız başla.
            </p>
          </div>
        ) : (
          <>
            <div className="zmsgs">
              {messages.map((m) => <Bubble key={m.id} msg={m} onOpen={openAtt} />)}
              {isStreaming && currentStreamContent && (
                <div className="zrow z-slide-up">
                  <Avatar />
                  <div className="zbubble zbubble-ai">
                    <div className="zmd"><ReactMarkdown remarkPlugins={[remarkGfm]}>{currentStreamContent}</ReactMarkdown></div>
                    <span className="stream-cursor" />
                  </div>
                </div>
              )}
              {isStreaming && !currentStreamContent && (
                <div className="zrow">
                  <Avatar />
                  <div className="zbubble zbubble-ai flex gap-1.5 items-center" style={{ height: 34 }}>
                    <span className="w-1.5 h-1.5 rounded-full z-bounce-1" style={{ background: 'var(--z-primary)' }} />
                    <span className="w-1.5 h-1.5 rounded-full z-bounce-2" style={{ background: 'var(--z-primary)' }} />
                    <span className="w-1.5 h-1.5 rounded-full z-bounce-3" style={{ background: 'var(--z-primary)' }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="zcomposer-dock">{composer(false)}</div>
          </>
        )}
      </div>

      {viewer && viewer.kind === 'image' && (
        <ImageLightbox url={viewer.url} name={viewer.name} onClose={() => setViewer(null)} />
      )}
      {viewer && viewer.kind === 'model' && (
        <ModelViewer url={viewer.url} ext={viewer.ext} name={viewer.name} onClose={() => setViewer(null)} />
      )}
    </div>
  );
}

function Bubble({ msg, onOpen }: { msg: ChatMessage; onOpen: (a: Attachment) => void }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  const hasText = typeof msg.content === 'string' ? msg.content.length > 0 : true;
  return (
    <div className={`zrow group ${isUser ? 'zrow-user' : ''} z-slide-up`}>
      {!isUser && <Avatar />}
      <div style={{ maxWidth: '82%' }}>
        {msg.attachments && msg.attachments.length > 0 && (
          <div className={isUser ? 'zbubble-atts zbubble-atts-user' : 'zbubble-atts'}>
            <AttachmentStrip items={msg.attachments} onOpen={onOpen} />
          </div>
        )}
        {hasText && (
        <div className={`zbubble ${isUser ? 'zbubble-user' : 'zbubble-ai'}`}>
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
          ) : <span className="zmuted zsm">[çok parçalı içerik]</span>}
        </div>
        )}
        <div className={`zmeta ${isUser ? 'zmeta-user' : ''}`}>
          <span className="zxs zmuted">{new Date(msg.timestamp).toLocaleTimeString('tr-TR')}</span>
          {msg.model && <span className="zxs zmuted">{msg.model}</span>}
          <button onClick={copy} className="zmeta-copy" title="Kopyala">
            {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.75} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Avatar() {
  return <img src={ZOLTTRAN_MARK} alt="Z" className="zavatar" draggable={false} />;
}
