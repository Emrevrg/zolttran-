/**
 * Studio — Tesana benzeri çalışma alanı.
 * Boşken: "Ne inşa edelim?" hero + composer.
 * Aktifken: 3 bölge — sol SOHBET · orta CANLI ÖNİZLEME · sağ ASSET AĞACI.
 * Dar sidebar'da sekmeli tek sütun; genişleyince sütunlar açılır.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Gamepad2, ArrowUp, Skull, Footprints, Swords, Dices, Sprout, Crosshair, Compass,
  Copy, Check, Paperclip, MessageSquare, MonitorPlay, ListTree, ClipboardCheck, X, type LucideIcon,
} from 'lucide-react';
import { useStore } from './store.js';
import { ModelSelector } from './components/ModelSelector.js';
import { AttachmentStrip, classifyFile } from './components/attachments.js';
import { ImageLightbox } from './components/ImageLightbox.js';
import { ModelViewer } from './components/ModelViewer.js';
import { StagePane } from './workspace/StagePane.js';
import { Inspector } from './workspace/Inspector.js';
import { buildPlan, type BuildPlan } from './workspace/plan.js';
import { ZOLTTRAN_MARK } from './assets/logo.js';
import type { ChatMessage, Attachment } from '../types/index.js';

const STARTERS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Skull,     title: 'Vampire Survivors', text: 'Vampire Survivors benzeri, bilim kurgu temalı bir bullet-heaven oyunu yap' },
  { icon: Footprints,title: '2D Platformer',    text: 'Wall-jump ve dash özellikli, akıcı bir 2D platform oyunu oluştur' },
  { icon: Swords,    title: 'Top-down RPG',      text: 'NPC diyalogları ve envanter sistemi olan top-down bir RPG yap' },
  { icon: Dices,     title: 'Roguelike',        text: 'Prosedürel zindanlar ve kalıcı ölüm içeren bir roguelike geliştir' },
  { icon: Sprout,    title: 'Cozy Çiftlik',      text: 'Ekim, hasat ve gün döngüsü olan cozy bir çiftlik simülasyonu yap' },
  { icon: Crosshair, title: '3D FPS',            text: '3D birinci şahıs nişancı — dalga bazlı düşmanlarla arena modu' },
  { icon: Compass,   title: 'Macera',            text: 'Keşif, nesne etkileşimi ve bulmacalarla top-down bir macera oyunu yap' },
];

export type Tab = 'chat' | 'stage' | 'inspect';

export function Studio({ onOpenProviders, tab, setTab }: { onOpenProviders: () => void; tab: Tab; setTab: (t: Tab) => void }) {
  const {
    messages, isStreaming, currentStreamContent, ready, freeMode, costToday, godotConnected,
    godotDetectedPath, currentProject, currentGdd, activeTasks, preview,
    postMessage, addMessage, setStreaming, setStageModel,
  } = useStore();
  const engineReady = !!godotDetectedPath || godotConnected;
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [viewer, setViewer] = useState<Attachment | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [plan, setPlan] = useState<{ plan: BuildPlan; prompt: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = messages.length > 0 || isStreaming || !!currentProject || !!currentGdd || activeTasks.length > 0 || plan != null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isStreaming, currentStreamContent.length, plan]);

  // Oyun çalışınca / kurulmaya başlayınca sahneyi öne getir (dar modda)
  useEffect(() => { if (preview.running) setTab('stage'); }, [preview.running]);
  useEffect(() => { if (activeTasks.length > 0) setTab('stage'); }, [activeTasks.length]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files).map(classifyFile);
    if (list.length) setAttachments((prev) => [...prev, ...list]);
  }, []);
  const removeAtt = (id: string) => setAttachments((prev) => prev.filter((a) => a.id !== id));
  const openAtt = (a: Attachment) => {
    if (a.kind === 'model') { setStageModel({ url: a.url, ext: a.ext, name: a.name }); setTab('stage'); }
    else if (a.kind === 'image') setViewer(a);
  };

  const pushUser = (content: string) => addMessage({
    id: crypto.randomUUID(), role: 'user', content, timestamp: Date.now(),
    attachments: attachments.length ? attachments : undefined,
  });

  const send = useCallback(() => {
    const content = input.trim();
    if ((!content && attachments.length === 0) || isStreaming) return;
    pushUser(content);
    setStreaming(true);
    postMessage({ type: 'chat-message', payload: { content, attachments: attachments.map((a) => a.name) } });
    setInput(''); setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [input, attachments, isStreaming, postMessage, addMessage, setStreaming]);

  // "Oyunu Kur" → önce planı göster (Tarif → Plan → İnşa)
  const proposePlan = useCallback(() => {
    const content = input.trim();
    if (!content || isStreaming) return;
    pushUser(content);
    setPlan({ plan: buildPlan(content), prompt: content });
    setInput(''); setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [input, attachments, isStreaming, addMessage]);

  const approvePlan = () => {
    if (!plan) return;
    setStreaming(true);
    postMessage({ type: 'new-game', payload: { prompt: plan.prompt, gameType: 'custom' } });
    setPlan(null);
    setTab('stage');
  };

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const resize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };
  const pick = (text: string) => { setInput(text); textareaRef.current?.focus(); };

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isStreaming;
  const canBuild = input.trim().length > 0 && !isStreaming && !plan;

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
        <span className="zcomposer-hint hidden-sm">
          {input.length > 0
            ? <><kbd>↵</kbd> gönder · {input.trim().length} karakter</>
            : <><kbd>↵</kbd> gönder</>}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={proposePlan} disabled={!canBuild}
            className="zbtn zbtn-ghost zsm" title="Plan çıkar ve oyunu kur">
            <Gamepad2 size={14} strokeWidth={1.75} /> Oyunu Kur
          </button>
          <button onClick={send} disabled={!canSend}
            className={`zsend ${canSend ? 'active' : ''}`} title="Gönder (Enter)">
            <ArrowUp size={17} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );

  const chatColumn = (
    <div className="zchatcol">
      <div className="zmsgs">
        {messages.length === 0 && !isStreaming && !plan && (
          <div className="zchat-hint">Oyununu tarif et — planı onayla, ajanlar kursun, sonra sağda oyna.</div>
        )}
        {messages.map((m) => <Bubble key={m.id} msg={m} onOpen={openAtt} />)}
        {plan && <PlanCard data={plan.plan} onApprove={approvePlan} onCancel={() => setPlan(null)} />}
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
    </div>
  );

  return (
    <div className="zstudio">
      <div className="ztopbar">
        <span className="zbrand">
          <span className="zbrand-name zgrad">ZOLTTRAN</span>
          <span className="zbrand-sub">AI GAME STUDIO</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="zstat"><span className={`zdot ${ready ? 'zdot-connected' : 'zdot-warning'}`} />{ready ? 'Hazır' : 'Bağlanıyor'}</span>
          <span className="zstat" style={{ opacity: engineReady ? 1 : 0.6 }}>
            <Gamepad2 size={13} strokeWidth={1.75} style={{ color: engineReady ? 'var(--z-success)' : 'inherit' }} />
            Engine
            <span className={`zdot ${engineReady ? 'zdot-connected' : 'zdot-idle'}`} style={{ width: 5, height: 5 }} />
          </span>
          {freeMode ? <span className="zchip zchip-free">FREE</span> : <span className="zstat">${costToday.toFixed(3)}</span>}
        </div>
      </div>

      {!active ? (
        <div className="zconvo">
          <div className="zhero">
            <img src={ZOLTTRAN_MARK} alt="Zolttran" className="zhero-logo" draggable={false} />
            <h1 className="zhero-title">Ne inşa edelim?</h1>
            <p className="zhero-sub">Tek bir cümle yaz — Zolttran tasarımdan derlemeye kadar her şeyi kendi halleder.</p>
            {composer(true)}
            <div className="zchips">
              {STARTERS.map((s) => {
                const Icon = s.icon;
                return (
                  <button key={s.title} className="zchip-starter" onClick={() => pick(s.text)} title={s.text}>
                    <Icon size={14} strokeWidth={1.9} /> {s.title}
                  </button>
                );
              })}
            </div>
            <p className="zxs zmuted zhero-foot">
              <button className="zlink" onClick={onOpenProviders}>Provider bağla</button> ya da FREE MODE ile anahtarsız başla.
            </p>
          </div>
        </div>
      ) : (
        <div className="zws">
          <div className="zws-tabs">
            <TabBtn cur={tab} id="chat"    icon={MessageSquare} label="Sohbet"   onClick={setTab} />
            <TabBtn cur={tab} id="stage"   icon={MonitorPlay}   label="Oyun"     onClick={setTab} badge={preview.running ? 'live' : activeTasks.length ? 'run' : undefined} />
            <TabBtn cur={tab} id="inspect" icon={ListTree}      label="Varlıklar" onClick={setTab} />
          </div>
          <div className="zws-cols">
            <div className="zws-col zws-chat"    data-active={tab === 'chat' || undefined}>{chatColumn}</div>
            <div className="zws-col zws-stage"   data-active={tab === 'stage' || undefined}><StagePane /></div>
            <div className="zws-col zws-inspect" data-active={tab === 'inspect' || undefined}><Inspector onOpenProviders={onOpenProviders} /></div>
          </div>
        </div>
      )}

      {viewer && viewer.kind === 'image' && (
        <ImageLightbox url={viewer.url} name={viewer.name} onClose={() => setViewer(null)} />
      )}
      {viewer && viewer.kind === 'model' && (
        <ModelViewer url={viewer.url} ext={viewer.ext} name={viewer.name} onClose={() => setViewer(null)} />
      )}
    </div>
  );
}

function TabBtn({ cur, id, icon: Icon, label, onClick, badge }:
  { cur: string; id: Tab; icon: LucideIcon; label: string; onClick: (t: Tab) => void; badge?: string }) {
  return (
    <button className={`zws-tab ${cur === id ? 'active' : ''}`} onClick={() => onClick(id)}>
      <Icon size={14} strokeWidth={1.9} /> {label}
      {badge && <span className={`zws-tab-dot ${badge === 'live' ? 'live' : ''}`} />}
    </button>
  );
}

function PlanCard({ data, onApprove, onCancel }: { data: BuildPlan; onApprove: () => void; onCancel: () => void }) {
  return (
    <div className="zrow z-slide-up">
      <Avatar />
      <div className="zplan">
        <div className="zplan-head">
          <ClipboardCheck size={15} strokeWidth={1.9} style={{ color: 'var(--z-secondary)' }} />
          <span>Yapım Planı</span>
          <span className="zchip zchip-free" style={{ marginLeft: 'auto' }}>{data.gameType}</span>
        </div>
        <div className="zplan-sum">{data.summary}</div>
        <ol className="zplan-steps">
          {data.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
        <div className="zplan-actions">
          <button className="zbtn zbtn-primary zsm" onClick={onApprove}>
            <Check size={14} strokeWidth={2.2} /> Onayla & İnşa Et
          </button>
          <button className="zbtn zbtn-ghost zsm" onClick={onCancel}>
            <X size={13} strokeWidth={2} /> Vazgeç
          </button>
        </div>
      </div>
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
