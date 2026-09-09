'use client';

import { Volume2, VolumeX, Globe } from 'lucide-react';
import { useKioskStore } from '@/store/kioskStore';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  showTtsToggle?: boolean;
  showLang?: boolean;
  className?: string;
}

export function Header({
  title = 'MediKiosk',
  showTtsToggle = false,
  showLang = false,
  className,
}: HeaderProps) {
  const { ttsEnabled, toggleTTS, tokenNumber } = useKioskStore();

  return (
    <header
      className={cn(
        'bg-teal-700 text-white px-4 py-3 flex items-center justify-between shadow-md',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center font-bold text-lg">
          M
        </div>
        <div>
          <div className="font-bold text-lg leading-tight">{title}</div>
          <div className="text-teal-200 text-xs">AI Clinical History · SIH PS-47</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {tokenNumber && (
          <div className="bg-white/20 rounded-xl px-3 py-1 text-sm font-semibold">
            Token #{tokenNumber}
          </div>
        )}

        {showLang && (
          <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors touch-target">
            <Globe className="w-4 h-4" />
            <span>EN</span>
          </button>
        )}

        {showTtsToggle && (
          <button
            onClick={toggleTTS}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors touch-target"
            aria-label={ttsEnabled ? 'Mute voice' : 'Enable voice'}
          >
            {ttsEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{ttsEnabled ? 'Sound ON' : 'Sound OFF'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
