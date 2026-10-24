import { apiUrl } from '../../lib/api';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FloppyDisk, PencilSimple, Spinner } from '@phosphor-icons/react';

export default function DocumentEditModal({ isOpen, onClose, document, currentUser, onSaved }) {
  const [form, setForm] = useState({ name: '', category: '', tags: '', summary: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && document) {
      setForm({
        name: document.name || '',
        category: document.category || '',
        tags: (document.tags || []).join(', '),
        summary: document.extractedData?.summary || '',
      });
      setError(null);
    }
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const response = await fetch(apiUrl(`/api/documents/${document._id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          tags: tagsArray,
          summary: form.summary,
        }),
      });
      if (!response.ok) throw new Error('Failed to save changes.');
      const data = await response.json();
      onSaved(data.document);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <PencilSimple size={20} weight="bold" className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">Edit Document</h2>
              <p className="text-xs text-[var(--muted)] truncate max-w-[260px]">{document.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">Document Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] transition-all"
              placeholder="Document name"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">Category</label>
            <input
              type="text"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-3 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] transition-all"
              placeholder="e.g. Finance, Education, Personal"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">Tags <span className="normal-case font-normal">(comma separated)</span></label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              className="w-full px-4 py-3 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] transition-all"
              placeholder="e.g. invoice, 2026, important"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">Summary</label>
            <textarea
              rows={4}
              value={form.summary}
              onChange={e => setForm({ ...form, summary: e.target.value })}
              className="w-full px-4 py-3 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] transition-all resize-none"
              placeholder="Document summary..."
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-hover)]/50">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            {saving ? <Spinner size={16} weight="bold" className="animate-spin" /> : <FloppyDisk size={16} weight="bold" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
