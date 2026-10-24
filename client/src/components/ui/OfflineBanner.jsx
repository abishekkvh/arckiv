import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiSlash, ArrowsClockwise } from '@phosphor-icons/react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        className="fixed top-0 inset-x-0 z-[100] bg-rose-600 text-white px-4 py-2 text-xs font-semibold shadow-lg flex items-center justify-center gap-3"
      >
        <div className="flex items-center gap-2">
          <WifiSlash size={16} weight="bold" />
          <span>You are currently offline. Arckiv changes will sync once connection is restored.</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-2.5 py-0.5 bg-white/20 hover:bg-white/30 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors"
        >
          <ArrowsClockwise size={12} weight="bold" />
          <span>Retry</span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
