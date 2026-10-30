import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CaretLeft, 
  CaretRight, 
  WarningCircle, 
  Files,
  SpinnerGap
} from '@phosphor-icons/react';
import { pct } from './adminData';

export function LoadState({ state, text = 'Loading telemetry & records…' }) {
  if (state.loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs my-4">
        <SpinnerGap size={28} weight="bold" className="inline-block animate-spin text-blue-600 mb-3" />
        <p className="text-xs text-slate-500 font-medium">{text}</p>
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl my-4 text-xs flex items-center gap-3 shadow-xs">
        <WarningCircle size={20} weight="fill" className="shrink-0 text-rose-600" />
        <span className="font-medium">{state.error}</span>
      </div>
    );
  }
  return null;
}

export function EmptyState({ title = 'No records found', message = 'No data matching your query was returned.', icon: Icon = Files }) {
  return (
    <div className="py-14 px-6 text-center border border-dashed border-slate-200 rounded-2xl bg-white shadow-xs my-4">
      <div className="w-12 h-12 mx-auto mb-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
        <Icon size={24} weight="duotone" />
      </div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed">{message}</p>
    </div>
  );
}

export function AdminBadge({ variant = 'neutral', children, size = 'sm' }) {
  const variants = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    disabled: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
    admin: 'bg-purple-50 text-purple-700 border-purple-200 font-semibold',
    user: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
    ml: 'bg-blue-50 text-blue-700 border-blue-200 font-semibold',
    gemini: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
    default: 'bg-slate-100 text-slate-600 border-slate-200 font-medium',
    manual: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    degraded: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
    failed: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200 font-medium',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-sans tracking-wide ${
        variants[variant] || variants.neutral
      } ${sizes[size] || sizes.sm}`}
    >
      {children}
    </span>
  );
}

export function StatCard({ title, value, note, icon: Icon, badge, color = 'blue' }) {
  const iconColors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-xl border transition-colors ${iconColors[color] || iconColors.blue}`}>
            <Icon size={18} weight="duotone" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2.5">
        <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
          {value ?? '—'}
        </span>
        {badge && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            {badge}
          </span>
        )}
      </div>
      {note && (
        <p className="text-xs text-slate-500 mt-2 truncate font-medium">
          {note}
        </p>
      )}
    </div>
  );
}

export function ConfidenceMeter({ value, threshold = 0.45 }) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return <span className="text-xs text-slate-400 font-mono font-medium">N/A</span>;
  }

  const isAccepted = value >= threshold;
  const percentage = Math.min(100, Math.max(0, value * 100));
  const thresholdPct = threshold * 100;

  return (
    <div className="w-full min-w-[130px]">
      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
        <span className={isAccepted ? 'text-emerald-700 font-bold' : 'text-amber-700 font-semibold'}>
          {pct(value)}
        </span>
        <span className="text-[11px] text-slate-500 font-sans">Gate: {pct(threshold)}</span>
      </div>
      <div className="relative h-2 w-full bg-slate-100 border border-slate-200/90 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isAccepted ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
        {/* Threshold indicator line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-800 z-10"
          style={{ left: `${thresholdPct}%` }}
          title={`Threshold: ${pct(threshold)}`}
        />
      </div>
    </div>
  );
}

export function AdminPagination({ page, pages, total, limit, onPage }) {
  if (pages <= 1 && total <= limit) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 text-xs text-slate-500">
      <div>
        Showing page <span className="text-slate-900 font-semibold">{page}</span> of{' '}
        <span className="text-slate-900 font-semibold">{pages}</span>
        {total !== undefined && (
          <span className="text-slate-500 ml-1.5 font-mono">({total} total records)</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 shadow-xs cursor-pointer"
        >
          <CaretLeft size={14} weight="bold" />
          <span>Previous</span>
        </button>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 shadow-xs cursor-pointer"
        >
          <span>Next</span>
          <CaretRight size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}

export function AdminDrawer({ isOpen, onClose, title, subtitle, icon: Icon, children, maxWidth = 'max-w-2xl' }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className={`relative z-10 w-full ${maxWidth} bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full`}
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-3.5 min-w-0">
                {Icon && (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                    <Icon size={20} weight="duotone" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate tracking-tight">{title}</h3>
                  {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Close drawer (Esc)"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function AdminModal({ isOpen, onClose, onConfirm, title, description, confirmText = 'Confirm', isDestructive = false, loading = false, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-left"
          >
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {description && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{description}</p>}
            
            {children && <div className="mt-4">{children}</div>}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                  isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                }`}
              >
                {loading ? 'Processing…' : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfusionMatrixHeatmap({ labels, matrix, title = 'Confusion Matrix' }) {
  if (!matrix || !Array.isArray(matrix) || !matrix.length) {
    return <EmptyState title="Confusion Matrix Unavailable" message="No matrix data in current model evaluation artifact." />;
  }

  let maxDiag = 1;
  let maxOff = 1;
  matrix.forEach((row, i) => {
    row.forEach((val, j) => {
      if (i === j) maxDiag = Math.max(maxDiag, val);
      else maxOff = Math.max(maxOff, val);
    });
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4 text-xs">
        <span className="font-bold text-slate-900">{title}</span>
        <span className="text-[11px] text-slate-500 font-medium">Rows: Actual • Columns: Predicted</span>
      </div>
      <table className="w-full text-xs font-mono text-center border-collapse">
        <thead>
          <tr>
            <th className="p-3 text-left text-slate-500 font-sans text-xs font-semibold border-b border-slate-200 bg-slate-50/70 rounded-tl-lg">
              Actual \ Predicted
            </th>
            {labels.map((lbl) => (
              <th key={lbl} className="p-3 text-slate-700 font-sans font-semibold border-b border-slate-200 bg-slate-50/70 text-xs">
                {lbl}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              <th className="p-3 text-left text-slate-700 font-sans text-xs font-semibold border-r border-slate-200 bg-slate-50/40">
                {labels[i] || `Class ${i}`}
              </th>
              {row.map((val, j) => {
                const isDiag = i === j;
                const intensity = isDiag
                  ? Math.min(0.85, Math.max(0.12, val / maxDiag))
                  : val > 0
                  ? Math.min(0.75, Math.max(0.18, val / maxOff))
                  : 0;

                const bg = isDiag
                  ? `rgba(16, 185, 129, ${intensity})` // emerald
                  : val > 0
                  ? `rgba(244, 63, 94, ${intensity})` // rose
                  : '#FFFFFF';

                const textColor = val > 0 
                  ? (intensity > 0.4 ? (isDiag ? 'text-emerald-950 font-bold' : 'text-rose-950 font-bold') : 'text-slate-800 font-semibold')
                  : 'text-slate-300';

                return (
                  <td
                    key={j}
                    className="p-3 transition-all border border-slate-100"
                    style={{ backgroundColor: bg }}
                  >
                    <span className={textColor}>
                      {val}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
