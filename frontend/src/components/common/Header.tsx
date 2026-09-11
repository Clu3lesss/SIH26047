'use client';

import { Volume2, VolumeX, Globe, Stethoscope } from 'lucide-react';
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
  const { ttsEnabled, toggleTTS, tokenNumber, tokenStatus } = useKioskStore();

  return (
    <header
      className={cn(
        'bg-slate-900 text-white px-5 py-3 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-2xs z-30',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white shadow-xs">
          <Stethoscope className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-sm tracking-tight flex items-center gap-2">
            <span>{title}</span>
          </div>
          <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1.5">
            <span>MediKiosk</span>
            <span>·</span>
            <span className="text-teal-400">Clinical History Platform</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {tokenNumber && (
          <div className="rounded-md px-3 py-1 text-xs font-bold flex items-center gap-1.5 border tracking-tight bg-teal-500/10 text-teal-300 border-teal-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            <span>Token #{tokenNumber}</span>
          </div>
        )}

        {showLang && (
          <button className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-md px-2.5 py-1 text-xs font-medium transition-colors">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>EN</span>
          </button>
        )}

        {showTtsToggle && (
          <button
            onClick={toggleTTS}
            className={cn(
              'flex items-center gap-1.5 border rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              ttsEnabled
                ? 'bg-teal-950/60 border-teal-600/40 text-teal-300 hover:bg-teal-900/60'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            )}
            aria-label={ttsEnabled ? 'Mute voice' : 'Enable voice'}
          >
            {ttsEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-teal-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{ttsEnabled ? 'Audio ON' : 'Audio Muted'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
