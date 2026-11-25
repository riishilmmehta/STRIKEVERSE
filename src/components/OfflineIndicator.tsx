import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 clip-angled-sm bg-[#0b101b]/95 border border-amber-400/80 px-3.5 py-2 text-xs font-display font-bold tracking-wider uppercase text-amber-200 shadow-2xl"
    >
      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
      <span>Offline Mode · Playing from Cache</span>
    </div>
  );
}
