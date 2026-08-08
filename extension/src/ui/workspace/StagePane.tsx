/**
 * StagePane — Studio'nun merkezi: canlı oynanabilir önizleme.
 * Oyun çalışıyorsa web export'u iframe'de gömülü oynatır; değilse
 * projeye göre "Çalıştır/İnşa Et" çağrısı gösterir. (Tesana'daki orta sahne.)
 */
import React from 'react';
import { Play, Square, RotateCw, ExternalLink, Gamepad2, Loader2, Cpu } from 'lucide-react';
import { useStore } from '../store.js';

export function StagePane() {
  const { preview, currentProject, currentGdd, activeTasks, isBuildingAll, postMessage } = useStore();
  const building = activeTasks.length > 0 || isBuildingAll;
  const hasProject = !!currentProject || !!currentGdd;
  const title = currentGdd?.title ?? currentProject?.name ?? 'Oyun';

  return (
    <div className="zstage">
      <div className="zstage-bar">
        <span className="zstage-title"><Gamepad2 size={14} strokeWidth={1.9} /> {title}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {preview.running ? (
            <>
              {preview.fps ? <span className="zstage-metric">{preview.fps} FPS</span> : null}
              <button className="zicon-btn" title="Yenile" onClick={() => postMessage({ type: 'reload-preview' })}><RotateCw size={14} strokeWidth={1.8} /></button>
              <button className="zicon-btn" title="Yeni sekmede aç" onClick={() => preview.url && postMessage({ type: 'open-external', payload: { url: preview.url } })}><ExternalLink size={14} strokeWidth={1.8} /></button>
              <button className="zicon-btn zicon-danger" title="Durdur" onClick={() => postMessage({ type: 'stop-preview' })}><Square size={12} strokeWidth={2.2} /></button>
            </>
          ) : (
            <button className="zbtn zbtn-primary zxs" disabled={!hasProject || building}
              onClick={() => postMessage({ type: 'run-preview' })} title="Web export al ve oyna">
              <Play size={13} strokeWidth={2.2} /> Oyunu Çalıştır
            </button>
          )}
        </span>
      </div>

      <div className="zstage-body">
        {preview.running && preview.url ? (
          <iframe className="zstage-frame" src={preview.url} title="Oyun önizleme"
            allow="autoplay; fullscreen; gamepad; xr-spatial-tracking" />
        ) : building ? (
          <div className="zstage-empty">
            <div className="zstage-orb building"><Loader2 size={30} strokeWidth={1.6} className="z-spin" /></div>
            <div className="zstage-h">Oyunun kuruluyor…</div>
            <div className="zstage-p">Ajanlar sahneleri, kodu ve varlıkları üretiyor. Bittiğinde burada oynayabileceksin.</div>
            <div className="zstage-steps">
              {activeTasks.slice(0, 4).map((t) => (
                <div key={t.id} className="zstage-step"><span className="zdot zdot-executing" /> {t.title}</div>
              ))}
            </div>
          </div>
        ) : hasProject ? (
          <div className="zstage-empty">
            <div className="zstage-orb"><Play size={28} strokeWidth={1.8} /></div>
            <div className="zstage-h">Oynamaya hazır</div>
            <div className="zstage-p">Web önizlemesini başlat — oyunu doğrudan burada oyna, sonra sohbetten değiştir.</div>
            <button className="zbtn zbtn-primary zsm" style={{ marginTop: 14 }} onClick={() => postMessage({ type: 'run-preview' })}>
              <Play size={14} strokeWidth={2.2} /> Oyunu Çalıştır
            </button>
          </div>
        ) : (
          <div className="zstage-empty">
            <div className="zstage-orb dim"><Cpu size={26} strokeWidth={1.6} /></div>
            <div className="zstage-h">Sahne boş</div>
            <div className="zstage-p">Soldaki sohbete oyununu tarif et — planı onayla, ajanlar kursun, sonra burada oyna.</div>
          </div>
        )}
      </div>
    </div>
  );
}
