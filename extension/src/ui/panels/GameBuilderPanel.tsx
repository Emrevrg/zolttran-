import React, { useState } from 'react';
import { useStore } from '../store.js';
import { GamePreview } from '../components/GamePreview.js';
import { GAME_TEMPLATES } from '../../agent/prompts/game-templates.js';
import type { GameType } from '../../types/index.js';

type Section = 'preview' | 'scenes' | 'scripts' | 'new';

const TEMPLATE_ICONS: Record<GameType, string> = {
  'bullet-heaven': '🧛', 'platformer': '🏃', 'top-down-rpg': '⚔️',
  'fps': '🔫', 'roguelike': '🗡️', 'farm-sim': '🌾', 'strategy': '♟️', 'custom': '✨',
};

export function GameBuilderPanel() {
  const { currentGdd, currentProject, godotConnected, godotBridgeMethod, postMessage } = useStore();
  const [section, setSection] = useState<Section>(currentGdd ? 'preview' : 'new');
  const [prompt, setPrompt] = useState('');
  const [template, setTemplate] = useState<GameType | ''>('');
  const [building, setBuilding] = useState(false);

  const startGame = () => {
    if (!prompt.trim() || building) return;
    setBuilding(true);
    postMessage({ type: 'new-game', payload: { prompt, gameType: (template || 'custom') as GameType } });
    setTimeout(() => setBuilding(false), 3000);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3 py-3" style={{ gap: 12 }}>
      {/* Godot status */}
      <div className="glass-muted flex items-center gap-2 px-3 py-2" style={{ borderRadius: 8 }}>
        <span className={`zdot ${godotConnected ? 'zdot-connected' : 'zdot-idle'}`} />
        <span className="zsm" style={{ color: godotConnected ? 'var(--z-success)' : 'rgba(255,255,255,0.4)', flex: 1 }}>
          {godotConnected ? `Godot Bağlı — ${godotBridgeMethod?.toUpperCase()}` : 'Godot bağlı değil'}
        </span>
        {!godotConnected && (
          <button className="zbtn zbtn-ghost zsm" style={{ padding: '3px 10px' }}
            onClick={() => postMessage({ type: 'run-preview' })}>
            Bağlan
          </button>
        )}
        {currentProject && (
          <span className="zsm zmuted truncate" style={{ maxWidth: 120 }}>{currentProject.name}</span>
        )}
      </div>

      {/* GDD summary */}
      {currentGdd && (
        <div className="glass" style={{ padding: '12px 14px' }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{currentGdd.title}</div>
              <div className="zsm zmuted mt-0.5">{currentGdd.description}</div>
            </div>
            <span className="zbadge zbadge-free">{currentGdd.gameType}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {currentGdd.mechanics?.filter((m) => m.priority === 'core').map((m) => (
              <span key={m.name} style={{ fontSize: 10, background: 'rgba(124,106,247,0.15)', color: '#a78bfa', padding: '1px 8px', borderRadius: 100, border: '1px solid rgba(124,106,247,0.25)' }}>
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Section tabs */}
      <div className="ztab-bar" style={{ marginLeft: -12, marginRight: -12, paddingLeft: 12 }}>
        {(!currentGdd
          ? [['new', '✨ Yeni Oyun']] as const
          : [['preview', '▶ Önizleme'], ['scenes', '🎬 Sahneler'], ['scripts', '📝 Scriptler'], ['new', '✨ Yeni']] as const
        ).map(([id, label]) => (
          <button key={id} className={`ztab ${section === id ? 'active' : ''}`} onClick={() => setSection(id as Section)}>
            {label}
          </button>
        ))}
      </div>

      {/* NEW GAME section */}
      {section === 'new' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="zsec-head mb-2">Oyununu Tarif Et</div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Örn: Vampire Survivors benzeri bilim kurgu oyunu, düşmanlar uzaylı robotlar olsun..."
              className="zinput"
              rows={4}
              style={{ resize: 'none', lineHeight: 1.6 }}
            />
          </div>
          <div>
            <div className="zsec-head mb-2">Şablon (isteğe bağlı)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {Object.values(GAME_TEMPLATES).map((t) => (
                <button key={t.id} onClick={() => setTemplate(template === t.id ? '' : t.id)}
                  className="text-left transition-all"
                  style={{
                    padding: '8px 10px', borderRadius: 8,
                    background: template === t.id ? 'rgba(124,106,247,0.2)' : 'var(--z-muted)',
                    border: `1px solid ${template === t.id ? 'rgba(124,106,247,0.4)' : 'var(--z-muted-bdr)'}`,
                  }}>
                  <div className="flex items-center gap-1.5">
                    <span>{TEMPLATE_ICONS[t.id]}</span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{t.name}</span>
                  </div>
                  <div className="zxs zmuted mt-0.5">{t.description.slice(0, 40)}…</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={startGame} disabled={!prompt.trim() || building}
            className="zbtn zbtn-primary w-full" style={{ padding: '10px', justifyContent: 'center', fontSize: 13 }}>
            {building
              ? <><span className="z-spin inline-block mr-2">⚙</span>Oluşturuluyor...</>
              : '🚀 Oyunu Oluştur'}
          </button>
        </div>
      )}

      {/* PREVIEW section */}
      {section === 'preview' && (
        <div style={{ flex: 1, minHeight: 200 }}><GamePreview /></div>
      )}

      {/* SCENES section */}
      {section === 'scenes' && currentProject && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {currentProject.scenes.length === 0
            ? <div className="zmuted zsm text-center py-8">Sahne bulunamadı</div>
            : currentProject.scenes.map((scene) => (
              <div key={scene.path} className="glass-muted flex items-center gap-3 px-3 py-2" style={{ borderRadius: 8 }}>
                <span>🎬</span>
                <span className="zsm flex-1 truncate">{scene.name}.tscn</span>
                <button className="zbtn zbtn-ghost zsm" style={{ padding: '2px 10px' }}
                  onClick={() => postMessage({ type: 'open-file', payload: { path: scene.path } })}>
                  Aç
                </button>
              </div>
            ))
          }
        </div>
      )}

      {/* SCRIPTS section */}
      {section === 'scripts' && currentProject && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {currentProject.scripts.length === 0
            ? <div className="zmuted zsm text-center py-8">Script bulunamadı</div>
            : currentProject.scripts.map((script) => (
              <div key={script.path} className="glass-muted flex items-center gap-3 px-3 py-2" style={{ borderRadius: 8 }}>
                <span>📝</span>
                <span className="zsm flex-1 truncate">{script.path.split('/').pop()}</span>
                {script.errors.length > 0 && (
                  <span className="zsm" style={{ color: 'var(--z-danger)' }}>{script.errors.length} hata</span>
                )}
                <button className="zbtn zbtn-ghost zsm" style={{ padding: '2px 10px' }}
                  onClick={() => postMessage({ type: 'open-file', payload: { path: script.path } })}>
                  Aç
                </button>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
