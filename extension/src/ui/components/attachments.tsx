/**
 * Ek (attachment) yardımcıları ve önizleme şeridi.
 * Görsel/3D/ses/video/dosya — hepsi desteklenir, boyut sınırı yok.
 */
import React from 'react';
import { Box, Music, Film, FileText, X } from 'lucide-react';
import type { Attachment, AttachmentKind } from '../../types/index.js';

const MODEL_EXT = ['glb', 'gltf', 'obj', 'fbx', 'stl', 'ply', '3ds', 'dae', 'usdz'];

export function classifyFile(file: File): Attachment {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  let kind: AttachmentKind = 'file';
  if (file.type.startsWith('image/')) kind = 'image';
  else if (file.type.startsWith('audio/')) kind = 'audio';
  else if (file.type.startsWith('video/')) kind = 'video';
  else if (MODEL_EXT.includes(ext)) kind = 'model';
  return {
    id: crypto.randomUUID(),
    name: file.name,
    kind,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    url: URL.createObjectURL(file),
    ext,
  };
}

export function humanSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentStrip({ items, removable, onRemove, onOpen }: {
  items: Attachment[];
  removable?: boolean;
  onRemove?: (id: string) => void;
  onOpen?: (a: Attachment) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="zatt-strip">
      {items.map((a) => (
        <div key={a.id} className="zatt-tile" title={`${a.name} · ${humanSize(a.size)}`}
          onClick={() => onOpen?.(a)} role={onOpen ? 'button' : undefined}>
          {a.kind === 'image' ? (
            <img src={a.url} alt={a.name} className="zatt-thumb" draggable={false} />
          ) : (
            <div className="zatt-ic">{iconFor(a.kind)}</div>
          )}
          <div className="zatt-meta">
            <div className="zatt-name">{a.name}</div>
            <div className="zatt-sub">{a.kind === 'model' ? `3D · ${a.ext?.toUpperCase()}` : humanSize(a.size)}</div>
          </div>
          {removable && (
            <button className="zatt-x" title="Kaldır" onClick={(e) => { e.stopPropagation(); onRemove?.(a.id); }}>
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function iconFor(kind: AttachmentKind) {
  const p = { size: 18, strokeWidth: 1.75 as const };
  if (kind === 'model') return <Box {...p} />;
  if (kind === 'audio') return <Music {...p} />;
  if (kind === 'video') return <Film {...p} />;
  return <FileText {...p} />;
}
