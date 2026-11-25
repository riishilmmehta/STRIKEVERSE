import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'title' | 'modal';
}

export function PWAInstallButton({ variant = 'title' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Suppress button completely once running inside an installed standalone/fullscreen PWA
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop native install prompt
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.currentTarget.blur();
          void install();
        }}
        aria-label="Install STRIKEVERSE App"
        className={
          variant === 'modal'
            ? 'clip-angled-sm w-full py-2.5 bg-sky-500/20 hover:bg-sky-500 text-sky-200 hover:text-slate-950 border border-sky-400/65 font-display font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-2'
            : 'pointer-events-auto clip-bevel px-3.5 py-2.5 bg-[#0b101b]/92 hover:bg-[#131d33] border border-sky-400/75 text-sky-200 hover:text-white font-display font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer shadow-xl flex items-center gap-2 shrink-0'
        }
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 10l5 5 5-5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V3" />
        </svg>
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari guided Add to Home Screen flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            setShowIOSGuide(true);
          }}
          aria-label="Install STRIKEVERSE on iOS"
          className={
            variant === 'modal'
              ? 'clip-angled-sm w-full py-2.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-400/55 font-display font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-2'
              : 'pointer-events-auto clip-bevel px-3.5 py-2.5 bg-[#0b101b]/92 hover:bg-[#131d33] border border-sky-400/65 text-sky-200 font-display font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer shadow-xl flex items-center gap-2 shrink-0'
          }
        >
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Install STRIKEVERSE on iOS"
              className="w-full max-w-sm bg-[#0e1526] border border-sky-400/65 clip-bevel p-6 shadow-2xl text-left"
            >
              <h3 className="font-display font-bold text-lg uppercase tracking-wider text-white">
                Install on iPhone / iPad
              </h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                1. Tap the <strong className="text-amber-300">Share</strong> button in Safari&apos;s toolbar.
                <br />
                2. Scroll down and tap <strong className="text-amber-300">Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="clip-angled-sm mt-4 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
