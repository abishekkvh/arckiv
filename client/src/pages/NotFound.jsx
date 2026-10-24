import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Files, House, ArrowLeft, FileDashed } from '@phosphor-icons/react';
import SpatialBackground from '../components/ui/SpatialBackground';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--background)] relative flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      <SpatialBackground density={20} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-lg w-full glass-card p-8 sm:p-12 space-y-6 shadow-2xl border border-[var(--border)]"
      >
        {/* Floating 3D Document Illustration */}
        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
          {/* Shadow document plane */}
          <motion.div
            animate={{ 
              rotateZ: [-6, -10, -6],
              y: [0, -6, 0]
            }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="absolute inset-0 bg-blue-500/10 rounded-2xl border border-blue-500/20 transform -rotate-6"
          />
          {/* Main document plane */}
          <motion.div
            animate={{ 
              rotateZ: [4, 8, 4],
              y: [0, -10, 0]
            }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 0.2 }}
            className="absolute inset-0 bg-white rounded-2xl border border-gray-200 shadow-xl flex items-center justify-center text-[var(--color-primary)]"
          >
            <FileDashed size={48} weight="duotone" />
          </motion.div>
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 bg-blue-50 text-[var(--color-primary)] text-xs font-mono font-bold rounded-full uppercase tracking-wider border border-blue-100">
            Error 404 • Resource Unreachable
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
            Document Not Found
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed max-w-sm mx-auto">
            The page, document, or route you are attempting to locate does not exist, has been relocated, or is no longer accessible.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-5 py-2.5 bg-[var(--color-primary)] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <House size={16} weight="bold" />
            <span>Return to Dashboard</span>
          </Link>
          <Link
            to="/my-files"
            className="w-full sm:w-auto px-5 py-2.5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-bold text-[var(--foreground)] rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Files size={16} weight="bold" />
            <span>Browse My Files</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
