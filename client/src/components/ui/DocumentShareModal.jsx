import { apiUrl } from '../../lib/api';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ShareNetwork, 
  QrCode, 
  Copy, 
  Check, 
  Clock, 
  DownloadSimple, 
  Eye, 
  ShieldCheck, 
  Prohibit, 
  Spinner,
  ArrowSquareOut,
  Sparkle
} from '@phosphor-icons/react';
import { QRCodeSVG } from 'qrcode.react';

export default function DocumentShareModal({ isOpen, onClose, document, currentUser }) {
  const [expiresIn, setExpiresIn] = useState('24h');
  const [permission, setPermission] = useState('view');
  const [customDate, setCustomDate] = useState('');
  
  const [generating, setGenerating] = useState(false);
  const [latestShare, setLatestShare] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const [shares, setShares] = useState([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [error, setError] = useState(null);

  const qrRef = useRef(null);

  // Fetch active and existing shares when modal opens
  const fetchShares = async () => {
    if (!document || !currentUser) return;
    setLoadingShares(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(apiUrl(`/api/documents/${document._id}/shares`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setShares(data);
      }
    } catch (err) {
      console.error('Failed to fetch shares:', err);
    } finally {
      setLoadingShares(false);
    }
  };

  useEffect(() => {
    if (isOpen && document) {
      setLatestShare(null);
      setError(null);
      setCopied(false);
      setExpiresIn('24h');
      setPermission('view');
      setCustomDate('');
      fetchShares();
    }
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const handleGenerateShare = async () => {
    setGenerating(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const payload = {
        permission,
        expiresIn: expiresIn === 'custom' ? undefined : expiresIn,
        customExpiresAt: expiresIn === 'custom' && customDate ? new Date(customDate).toISOString() : undefined
      };

      const res = await fetch(apiUrl(`/api/documents/${document._id}/shares`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create share link');
      }

      setLatestShare({
        ...data.share,
        shareUrl: data.shareUrl || `${window.location.origin}/shared/${data.share.token}`
      });
      fetchShares();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeShare = async (shareId) => {
    setRevokingId(shareId);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(apiUrl(`/api/documents/${document._id}/shares/${shareId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setShares(prev => prev.map(s => s._id === shareId ? { ...s, isActive: false } : s));
        if (latestShare && latestShare._id === shareId) {
          setLatestShare(prev => ({ ...prev, isActive: false }));
        }
      }
    } catch (err) {
      console.error('Failed to revoke share:', err);
    } finally {
      setRevokingId(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadQRCode = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = window.document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = window.document.createElement('a');
      downloadLink.download = `QR_${document.name.split('.')[0]}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

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
        className="relative w-full max-w-xl bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden z-10 flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <ShareNetwork size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">Secure Document Sharing</h2>
              <p className="text-xs text-[var(--muted)] truncate max-w-[280px]">{document.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Create Share Configuration */}
          <div className="bg-[var(--surface-hover)] border border-[var(--border)] p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
                <ShieldCheck size={16} weight="bold" />
                <span>Create Time-Limited Share Link</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Expiration Selector */}
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 flex items-center gap-1">
                  <Clock size={14} /> Expiration Duration
                </label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="1h">1 Hour</option>
                  <option value="24h">24 Hours (1 Day)</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">30 Days</option>
                  <option value="custom">Custom Date/Time</option>
                </select>
              </div>

              {/* Permission Selector */}
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 flex items-center gap-1">
                  <Eye size={14} /> Recipient Permission
                </label>
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="view">View Only (No Download)</option>
                  <option value="download">View & Download File</option>
                </select>
              </div>
            </div>

            {/* Custom Expiration Picker */}
            {expiresIn === 'custom' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">Select Expiration Date & Time</label>
                <input
                  type="datetime-local"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg font-medium">{error}</p>
            )}

            <button
              onClick={handleGenerateShare}
              disabled={generating || (expiresIn === 'custom' && !customDate)}
              className="w-full py-3 bg-[var(--color-primary)] hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-98 disabled:opacity-50"
            >
              {generating ? <Spinner size={18} className="animate-spin" /> : <Sparkle size={18} weight="fill" />}
              <span>{generating ? 'Generating Secure Link...' : 'Generate Share Link & QR'}</span>
            </button>
          </div>

          {/* Generated Share Display */}
          <AnimatePresence>
            {latestShare && latestShare.isActive && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/30 p-5 rounded-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <ShieldCheck size={16} weight="fill" />
                    <span>Secure Link Active</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    Expires: {new Date(latestShare.expiresAt).toLocaleDateString()} {new Date(latestShare.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Share Link Box */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={latestShare.shareUrl}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-[var(--border)] rounded-xl text-xs font-mono text-[var(--foreground)] select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(latestShare.shareUrl)}
                    className="px-4 py-2.5 bg-[var(--color-primary)] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                {/* QR Code Section */}
                <div className="pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <div ref={qrRef} className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-200 inline-block">
                      <QRCodeSVG
                        value={latestShare.shareUrl}
                        size={96}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-[var(--foreground)]">Direct Access QR</p>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">Recipients can scan to open document directly.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={downloadQRCode}
                      className="flex-1 sm:flex-initial px-3.5 py-2 bg-white dark:bg-gray-900 border border-[var(--border)] hover:bg-[var(--surface-hover)] text-xs font-bold rounded-xl text-[var(--foreground)] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <DownloadSimple size={14} weight="bold" />
                      <span>Save QR</span>
                    </button>
                    <a
                      href={latestShare.shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white dark:bg-gray-900 border border-[var(--border)] hover:bg-[var(--surface-hover)] text-xs font-bold rounded-xl text-[var(--foreground)] flex items-center justify-center transition-colors"
                      title="Open Public Link"
                    >
                      <ArrowSquareOut size={16} weight="bold" />
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active / Existing Shares List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center justify-between">
              <span>Existing Share Links ({shares.length})</span>
              {loadingShares && <Spinner size={14} className="animate-spin text-[var(--color-primary)]" />}
            </h3>

            {shares.length === 0 && !loadingShares && (
              <p className="text-xs text-[var(--muted)] italic py-3 text-center bg-[var(--surface-hover)] rounded-xl">
                No active share links created yet for this document.
              </p>
            )}

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {shares.map((share) => {
                const isExpired = new Date() > new Date(share.expiresAt);
                const isEffectivelyActive = share.isActive && !isExpired;
                // NOTE: share.token is no longer stored in DB (security hardening).
                // The share URL is only available at link-creation time.
                // Old shares show permission + expiry info only.
                const fullShareUrl = null;

                return (
                  <div
                    key={share._id}
                    className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                      isEffectivelyActive 
                        ? 'bg-[var(--surface-hover)] border-[var(--border)]' 
                        : 'bg-gray-100/40 dark:bg-gray-900/30 border-dashed border-gray-300 dark:border-gray-800 opacity-60'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                          isEffectivelyActive 
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                        }`}>
                          {share.isActive ? (isExpired ? 'Expired' : 'Active') : 'Revoked'}
                        </span>
                        <span className="font-semibold text-[var(--foreground)] capitalize">
                          {share.permission === 'download' ? 'View & Download' : 'View Only'}
                        </span>
                        <span className="text-[11px] text-[var(--muted)]">
                          • {share.accessCount || 0} access{(share.accessCount || 0) === 1 ? '' : 'es'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--muted)] truncate">
                        Expires: {new Date(share.expiresAt).toLocaleDateString()} {new Date(share.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isEffectivelyActive && (
                        <>
                          {fullShareUrl ? (
                            <button
                              onClick={() => copyToClipboard(fullShareUrl)}
                              className="p-1.5 hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)] rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                              title="Copy link"
                            >
                              <Copy size={15} weight="bold" />
                            </button>
                          ) : (
                            <span
                              className="p-1.5 rounded-lg text-[var(--muted)] opacity-40 cursor-not-allowed"
                              title="URL only shown at creation time (security policy)"
                            >
                              <Copy size={15} weight="bold" />
                            </span>
                          )}
                          <button
                            onClick={() => handleRevokeShare(share._id)}
                            disabled={revokingId === share._id}
                            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold rounded-lg transition-colors flex items-center gap-1"
                            title="Revoke access immediately"
                          >
                            {revokingId === share._id ? <Spinner size={12} className="animate-spin" /> : <Prohibit size={14} weight="bold" />}
                            <span>Revoke</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--border)] bg-[var(--surface-hover)]/40 flex items-center justify-between text-xs text-[var(--muted)] shrink-0">
          <span>All share accesses are securely logged to audit history.</span>
          <button onClick={onClose} className="font-bold text-[var(--foreground)] hover:underline">Done</button>
        </div>
      </motion.div>
    </div>
  );
}
