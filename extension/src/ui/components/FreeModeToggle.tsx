import React from 'react';
import { useStore } from '../store.js';

export function FreeModeToggle() {
  const { freeMode, setFreeMode } = useStore();
  return (
    <button onClick={() => setFreeMode(!freeMode)} title={freeMode ? 'FREE MODE aktif' : 'Ücretli mod'}
      className="zbtn zsm flex-shrink-0"
      style={{
        padding: '5px 10px',
        background: freeMode ? 'rgba(74,222,128,0.15)' : 'var(--z-muted)',
        border: `1px solid ${freeMode ? 'rgba(74,222,128,0.3)' : 'var(--z-muted-bdr)'}`,
        color: freeMode ? 'var(--z-success)' : 'rgba(255,255,255,0.4)',
        fontWeight: 600,
      }}>
      {freeMode ? '🆓' : '💰'}
    </button>
  );
}
