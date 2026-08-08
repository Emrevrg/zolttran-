/**
 * ImageLightbox — sohbete eklenen görselleri tam ekran, yakınlaştırılabilir gösterir.
 */
import React, { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

export function ImageLightbox({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="zviewer">
      <div className="zviewer-scrim" onClick={onClose} />
      <div className="zviewer-stage">
        <div className="zviewer-head">
          <span className="zsm" style={{ fontWeight: 600 }}>{name}</span>
          <div className="flex items-center gap-1.5">
            <button className="zicon-btn" title="Uzaklaştır" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}><ZoomOut size={15} strokeWidth={1.75} /></button>
            <span className="zxs zmuted" style={{ width: 34, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button className="zicon-btn" title="Yakınlaştır" onClick={() => setZoom((z) => Math.min(5, z + 0.25))}><ZoomIn size={15} strokeWidth={1.75} /></button>
            <button className="zicon-btn" title="Kapat" onClick={onClose}><X size={16} strokeWidth={1.75} /></button>
          </div>
        </div>
        <div className="zviewer-canvas" style={{ overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.min(5, Math.max(0.25, z - e.deltaY * 0.001))); }}>
          <img src={url} alt={name} draggable={false}
            style={{ transform: `scale(${zoom})`, transition: 'transform .08s', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', userSelect: 'none' }} />
        </div>
        <div className="zviewer-foot zxs zmuted">Tekerlek: yakınlaştır · Esc: kapat</div>
      </div>
    </div>
  );
}
