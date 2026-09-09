'use client';

import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  isActive: boolean;
  className?: string;
  barCount?: number;
}

export function AudioWaveform({ isActive, className, barCount = 5 }: AudioWaveformProps) {
  const delays = ['0ms', '100ms', '200ms', '150ms', '50ms'];

  return (
    <div
      className={cn('flex items-center justify-center gap-0.5', className)}
      aria-hidden="true"
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1 rounded-full transition-all',
            isActive
              ? 'bg-white animate-sound-bar'
              : 'bg-white/40 h-1'
          )}
          style={{
            height: isActive ? undefined : '4px',
            animationDelay: delays[i % delays.length],
            animationDuration: `${0.6 + (i % 3) * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}
