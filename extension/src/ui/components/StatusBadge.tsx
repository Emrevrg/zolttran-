import React from 'react';

interface Props {
  status: 'connected' | 'error' | 'idle' | 'executing' | 'building' | 'success' | 'failed' | 'waiting';
  label?: string;
  size?: 'sm' | 'md';
}

const COLOR: Record<Props['status'], string> = {
  connected: 'text-green-400',
  success:   'text-green-400',
  error:     'text-red-400',
  failed:    'text-red-400',
  idle:      'text-gray-400',
  executing: 'text-indigo-400',
  building:  'text-yellow-400',
  waiting:   'text-yellow-500',
};

const DOT: Record<Props['status'], string> = {
  connected: 'bg-green-400 shadow-[0_0_6px_#22c55e]',
  success:   'bg-green-400',
  error:     'bg-red-400',
  failed:    'bg-red-400',
  idle:      'bg-gray-500',
  executing: 'bg-indigo-400 animate-pulse',
  building:  'bg-yellow-400 animate-pulse',
  waiting:   'bg-yellow-500',
};

export function StatusBadge({ status, label, size = 'sm' }: Props) {
  const sz = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  return (
    <span className={`inline-flex items-center gap-1.5 ${COLOR[status]} text-xs`}>
      <span className={`rounded-full flex-shrink-0 ${sz} ${DOT[status]}`} />
      {label ?? status}
    </span>
  );
}
