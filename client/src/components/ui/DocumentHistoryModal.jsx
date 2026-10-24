import { apiUrl } from '../../lib/api';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, UploadSimple, PencilSimple, Trash, ArrowRight, ClockCounterClockwise, Spinner, WarningCircle, ShareNetwork, Prohibit } from '@phosphor-icons/react';

function formatFileSize(bytes) {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(ts));
}

function EventIcon({ action }) {
  const base = 'p-2 rounded-xl text-white shrink-0';
  if (action === 'UPLOAD')  return <div className={`${base} bg-green-500`}><UploadSimple size={16} weight="bold" /></div>;
  if (action === 'EDIT')    return <div className={`${base} bg-blue-500`}><PencilSimple size={16} weight="bold" /></div>;
  if (action === 'SHARE')   return <div className={`${base} bg-emerald-500`}><ShareNetwork size={16} weight="bold" /></div>;
  if (action === 'UNSHARE') return <div className={`${base} bg-amber-500`}><Prohibit size={16} weight="bold" /></div>;
  if (action === 'DELETE')  return <div className={`${base} bg-red-500`}><Trash size={16} weight="bold" /></div>;
  return <div className={`${base} bg-gray-500`}><ClockCounterClockwise size={16} weight="bold" /></div>;
}

function ShareEntry({ metadata }) {
  return (
    <div className="mt-2 space-y-1 text-xs text-[var(--muted)]">
      <p><span className="font-semibold text-[var(--foreground)]">Permission:</span> <span className="capitalize">{metadata?.permission === 'download' ? 'View & Download' : 'View Only'}</span></p>
      <p><span className="font-semibold text-[var(--foreground)]">Expires At:</span> {formatDate(metadata?.expiresAt)}</p>
      {metadata?.shareId && <p><span className="font-semibold text-[var(--foreground)]">Share ID:</span> <span className="font-mono">{String(metadata.shareId)}</span></p>}
    </div>
  );
}

function UnshareEntry({ metadata }) {
  return (
    <div className="mt-2 space-y-1 text-xs text-[var(--muted)]">
      <p><span className="font-semibold text-[var(--foreground)]">Revoked At:</span> {formatDate(metadata?.revokedAt)}</p>
      {metadata?.shareId && <p><span className="font-semibold text-[var(--foreground)]">Revoked Share ID:</span> <span className="font-mono">{String(metadata.shareId)}</span></p>}
    </div>
  );
}

function UploadEntry({ metadata }) {
  return (
    <div className="mt-2 space-y-1 text-xs text-[var(--muted)]">
      <p><span className="font-semibold text-[var(--foreground)]">File:</span> {metadata.filename || '—'}</p>
      <p><span className="font-semibold text-[var(--foreground)]">Size:</span> {formatFileSize(metadata.size)}</p>
      <p><span className="font-semibold text-[var(--foreground)]">Type:</span> {metadata.type || '—'}</p>
      <p><span className="font-semibold text-[var(--foreground)]">AI Analysis:</span> {metadata.aiAnalysisSucceeded ? '✅ Succeeded' : '⚠️ Failed'}</p>
    </div>
  );
}

function EditEntry({ metadata }) {
  const changes = metadata?.changes || {};
  const keys = Object.keys(changes);
  if (keys.length === 0) return <p className="mt-2 text-xs text-[var(--muted)] italic">No field changes recorded.</p>;
  return (
    <div className="mt-2 space-y-2">
      {keys.map(key => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        const from = Array.isArray(changes[key].from) ? changes[key].from.join(', ') : String(changes[key].from ?? '—');
        const to   = Array.isArray(changes[key].to)   ? changes[key].to.join(', ')   : String(changes[key].to   ?? '—');
        return (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="font-bold text-[var(--foreground)] w-20 shrink-0">{formattedKey}</span>
            <span className="line-through text-red-400 truncate max-w-[120px]" title={from}>{from || <em>empty</em>}</span>
            <ArrowRight size={12} className="text-[var(--muted)] mt-0.5 shrink-0" />
            <span className="text-green-500 font-semibold truncate max-w-[120px]" title={to}>{to || <em>empty</em>}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function DocumentHistoryModal({ isOpen, onClose, document, currentUser }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !document) return;
    setHistory([]);
    setError(null);
    setLoading(true);
    (async () => {
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(apiUrl(`/api/documents/${document._id}/history`), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch history.');
        const data = await res.json();
        setHistory(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden z-10 flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <ClockCounterClockwise size={20} weight="bold" className="text-purple-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">Activity History</h2>
              <p className="text-xs text-[var(--muted)] truncate max-w-[260px]">{document.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Spinner size={28} weight="bold" className="animate-spin text-[var(--color-primary)]" />
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-4 rounded-xl">
              <WarningCircle size={20} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          {!loading && !error && history.length === 0 && (
            <div className="text-center py-16">
              <ClockCounterClockwise size={40} weight="duotone" className="text-[var(--muted)] mx-auto mb-3" />
              <p className="text-sm font-semibold text-[var(--foreground)]">No history yet</p>
              <p className="text-xs text-[var(--muted)] mt-1">Events will appear here as you edit or manage this document.</p>
            </div>
          )}
          {!loading && !error && history.length > 0 && (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--border)]" />
              <div className="space-y-6 pl-12">
                {history.map((event, i) => (
                  <motion.div
                    key={event._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-[2.75rem] top-1">
                      <EventIcon action={event.action} />
                    </div>

                    <div className="bg-[var(--surface-hover)] border border-[var(--border)] rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
                          {event.action}
                        </span>
                        <span className="text-xs text-[var(--muted)]">{formatDate(event.createdAt)}</span>
                      </div>

                      {event.action === 'UPLOAD' && <UploadEntry metadata={event.metadata} />}
                      {event.action === 'EDIT' && <EditEntry metadata={event.metadata} />}
                      {event.action === 'SHARE' && <ShareEntry metadata={event.metadata} />}
                      {event.action === 'UNSHARE' && <UnshareEntry metadata={event.metadata} />}
                      {event.action === 'DELETE' && (
                        <p className="text-xs text-[var(--muted)] mt-2">Document was deleted at {formatDate(event.metadata?.deletedAt)}.</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--surface-hover)]/50 shrink-0">
          <p className="text-xs text-[var(--muted)] text-center">{history.length} event{history.length !== 1 ? 's' : ''} recorded</p>
        </div>
      </motion.div>
    </div>
  );
}
