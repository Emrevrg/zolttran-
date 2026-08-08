import React from 'react';
import { useStore } from '../store.js';

export function TokenCounter() {
  const { contextWindowUsage, contextWindowMax, costToday, freeMode } = useStore();
  const pct = contextWindowMax > 0 ? Math.round((contextWindowUsage / contextWindowMax) * 100) : 0;
  const barColor = pct > 85 ? 'var(--z-danger)' : pct > 65 ? 'var(--z-warning)' : 'var(--z-primary)';

  return (
    <div className="flex items-center gap-2 zxs zmuted" style={{ flexShrink: 0 }}>
      {contextWindowUsage > 0 && (
        <div className="flex items-center gap-1">
          <span>{(contextWindowUsage / 1000).toFixed(1)}k</span>
          <div style={{ width: 36, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 100, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}
      <span style={{ color: freeMode ? 'var(--z-success)' : 'inherit' }}>
        {freeMode ? '$0.00' : `$${costToday.toFixed(4)}`}
      </span>
    </div>
  );
}
