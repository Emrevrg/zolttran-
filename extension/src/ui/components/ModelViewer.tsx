/**
 * ModelViewer — 3D modelleri tam ekran döndürülebilir gösteren modal.
 * Çekirdek görüntüleyici ModelCanvas'tan gelir.
 */
import React, { useState } from 'react';
import { X, RotateCw } from 'lucide-react';
import { ModelCanvas } from './ModelCanvas.js';

export function ModelViewer({ url, ext, name, onClose }: { url: string; ext?: string; name: string; onClose: () => void }) {
  const [autoRotate, setAutoRotate] = useState(true);
  return (
    <div className="zviewer" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="zviewer-scrim" onClick={onClose} />
      <div className="zviewer-stage">
        <div className="zviewer-head">
          <span className="zsm" style={{ fontWeight: 600 }}>{name}</span>
          <div className="flex items-center gap-1.5">
            <button className={`zicon-btn ${autoRotate ? 'active' : ''}`} title="Otomatik döndür" onClick={() => setAutoRotate((v) => !v)}><RotateCw size={15} strokeWidth={1.75} /></button>
            <button className="zicon-btn" title="Kapat" onClick={onClose}><X size={16} strokeWidth={1.75} /></button>
          </div>
        </div>
        <div className="zviewer-canvas">
          <ModelCanvas url={url} ext={ext} autoRotate={autoRotate} />
        </div>
        <div className="zviewer-foot zxs zmuted">Sürükle: döndür · Kaydır: yakınlaştır · Sağ tık: kaydır</div>
      </div>
    </div>
  );
}
