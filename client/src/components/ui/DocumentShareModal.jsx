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
  Sparkle,
  CaretDown,
  Lightning,
  CalendarBlank,
  CalendarDots,
  LockKey,
  SlidersHorizontal
} from '@phosphor-icons/react';
import { QRCodeSVG } from 'qrcode.react';

const DURATION_OPTIONS = [
  {
    value: '1h',
    label: '1 Hour',
    description: 'Quick ephemeral link for fast reviews',
    badge: 'Short',
    icon: Lightning,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-950/40'
  },
  {
    value: '24h',
    label: '24 Hours (1 Day)',
    description: 'Standard temporary access (Recommended)',
    badge: 'Popular',
    icon: Clock,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50 dark:bg-blue-950/40'
  },
  {
    value: '7d',
    label: '7 Days (1 Week)',
    description: 'Extended review window for team members',
    icon: CalendarBlank,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/40'
  },
  {
    value: '30d',
    label: '30 Days (1 Month)',
    description: 'Long-term read/download access',
    icon: CalendarDots,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50 dark:bg-purple-950/40'
  },
  {
    value: 'custom',
    label: 'Custom Date & Time',
    description: 'Specify an exact calendar expiration timestamp',
    icon: SlidersHorizontal,
    iconColor: 'text-teal-600',
    iconBg: 'bg-teal-50 dark:bg-teal-950/40'
  }
];

export default function DocumentShareModal({ isOpen, onClose, document, currentUser }) {
  const [expiresIn, setExpiresIn] = useState('24h');
  const [permission, setPermission] = useState('view');
  const [customDate, setCustomDate] = useState('');
  const [durationDropdownOpen, setDurationDropdownOpen] = useState(false);
  
  const [generating, setGenerating] = useState(false);
  const [latestShare, setLatestShare] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const [shares, setShares] = useState([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [error, setError] = useState(null);

  const qrRef = useRef(null);
  const durationDropdownRef = useRef(null);

  // Close dropdown on click outside or escape
  useEffect(() => {
    if (!durationDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (durationDropdownRef.current && !durationDropdownRef.current.contains(e.target)) {
        setDurationDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDurationDropdownOpen(false);
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    window.document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.document.removeEventListener('mousedown', handleClickOutside);
      window.document.removeEventListener('keydown', handleKeyDown);
    };
  }, [durationDropdownOpen]);

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
      setDurationDropdownOpen(false);
      fetchShares();
    }
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const selectedDuration = DURATION_OPTIONS.find(o => o.value === expiresIn) || DURATION_OPTIONS[1];
  const SelectedDurationIcon = selectedDuration.icon;

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
          {/* Create Share Configuration Card */}
          <div className="bg-gradient-to-b from-blue-50/40 via-white to-slate-50/50 dark:from-blue-950/20 dark:via-[var(--surface)] dark:to-[var(--surface)] border border-blue-200/80 dark:border-blue-900/40 p-6 rounded-3xl space-y-5 shadow-xs">
            {/* Card Header & Security Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-blue-100/70 dark:border-blue-900/30">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck size={16} weight="bold" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-950 dark:text-white">
                    Create Time-Limited Share Link
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Generates a cryptographically signed zero-knowledge link
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/60 dark:border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SHA-256 Protected
              </span>
            </div>

            {/* Recipient Permission (Selection Cards) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <LockKey size={14} className="text-blue-600" weight="bold" />
                  <span>Recipient Permission</span>
                </label>
                <span className="text-[11px] text-gray-400">Controls what the recipient can do</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* View Only Option */}
                <button
                  type="button"
                  onClick={() => setPermission('view')}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-start gap-3 relative cursor-pointer ${
                    permission === 'view'
                      ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white dark:bg-gray-900 border-gray-200/90 dark:border-gray-800 hover:border-gray-300 hover:bg-gray-50/60'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    permission === 'view' ? 'bg-blue-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}>
                    <Eye size={16} weight="bold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${permission === 'view' ? 'text-blue-950 dark:text-blue-100' : 'text-gray-900 dark:text-white'}`}>
                        View Only
                      </span>
                      {permission === 'view' && (
                        <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                          <Check size={11} weight="bold" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      Browser preview only. Downloads blocked.
                    </p>
                  </div>
                </button>

                {/* View & Download Option */}
                <button
                  type="button"
                  onClick={() => setPermission('download')}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-start gap-3 relative cursor-pointer ${
                    permission === 'download'
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white dark:bg-gray-900 border-gray-200/90 dark:border-gray-800 hover:border-gray-300 hover:bg-gray-50/60'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    permission === 'download' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}>
                    <DownloadSimple size={16} weight="bold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${permission === 'download' ? 'text-emerald-950 dark:text-emerald-100' : 'text-gray-900 dark:text-white'}`}>
                        View & Download
                      </span>
                      {permission === 'download' && (
                        <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                          <Check size={11} weight="bold" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      Full access to view and download original file.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Expiration Duration (Custom Selectable Dropdown & Quick Chips) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <Clock size={14} className="text-blue-600" weight="bold" />
                  <span>Expiration Duration</span>
                </label>
                <span className="text-[11px] text-gray-400">Link auto-deactivates after this window</span>
              </div>

              {/* Custom Dropdown Trigger */}
              <div ref={durationDropdownRef} className="relative z-20">
                <button
                  type="button"
                  onClick={() => setDurationDropdownOpen((prev) => !prev)}
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-2xl text-left flex items-center justify-between transition-all duration-200 shadow-2xs cursor-pointer ${
                    durationDropdownOpen
                      ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                      : 'border-gray-200/90 dark:border-gray-800 hover:border-blue-300'
                  }`}
                  aria-haspopup="listbox"
                  aria-expanded={durationDropdownOpen}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl ${selectedDuration.iconBg} ${selectedDuration.iconColor} flex items-center justify-center shrink-0`}>
                      <SelectedDurationIcon size={16} weight="bold" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-950 dark:text-white truncate">
                          {selectedDuration.label}
                        </span>
                        {selectedDuration.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {selectedDuration.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">
                        {selectedDuration.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 shrink-0 ml-2">
                    <span className="text-[11px] font-medium hidden sm:inline text-gray-400">Select</span>
                    <CaretDown
                      size={14}
                      weight="bold"
                      className={`transition-transform duration-200 ${durationDropdownOpen ? 'rotate-180 text-blue-600' : ''}`}
                    />
                  </div>
                </button>

                {/* Custom Animated Floating Menu */}
                <AnimatePresence>
                  {durationDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-full left-0 right-0 mt-2 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/90 dark:border-gray-800 shadow-2xl rounded-2xl p-1.5 space-y-1 ring-1 ring-black/5"
                    >
                      {DURATION_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = expiresIn === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setExpiresIn(opt.value);
                              setDurationDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100 shadow-xs'
                                : 'hover:bg-gray-100/70 dark:hover:bg-gray-800/70 text-gray-700 dark:text-gray-300 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-xl ${opt.iconBg} ${opt.iconColor} flex items-center justify-center shrink-0`}>
                                <Icon size={16} weight="bold" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                    {opt.label}
                                  </span>
                                  {opt.badge && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                      {opt.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                  {opt.description}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 ml-2">
                                <Check size={12} weight="bold" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quick Duration Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1">Quick Select:</span>
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExpiresIn(opt.value)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      expiresIn === opt.value
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {opt.value === '1h' ? '1 Hour' : opt.value === '24h' ? '24 Hours' : opt.value === '7d' ? '7 Days' : opt.value === '30d' ? '30 Days' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Expiration Picker */}
            {expiresIn === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-white dark:bg-gray-900 border border-blue-200/90 dark:border-blue-900/60 rounded-2xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <SlidersHorizontal size={14} className="text-teal-600" weight="bold" />
                    <span>Exact Expiration Timestamp</span>
                  </label>
                  <span className="text-[10px] text-teal-600 font-semibold bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full">
                    Custom Scheduled
                  </span>
                </div>
                <input
                  type="datetime-local"
                  value={customDate}
                  min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50/70 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[11px] text-gray-400">
                  Access will automatically terminate and token will be invalidated at this exact date and time.
                </p>
              </motion.div>
            )}

            {error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl font-medium border border-red-200 dark:border-red-800/40">{error}</p>
            )}

            {/* Generate Action Button */}
            <button
              onClick={handleGenerateShare}
              disabled={generating || (expiresIn === 'custom' && !customDate)}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
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
                    className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 transition-all ${
                      isEffectivelyActive 
                        ? 'bg-white dark:bg-gray-900 border-gray-200/90 dark:border-gray-800 shadow-2xs' 
                        : 'bg-gray-50/70 dark:bg-gray-900/30 border-gray-200/80 dark:border-gray-800/80 opacity-70'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                          isEffectivelyActive 
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40' 
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40'
                        }`}>
                          {share.isActive ? (isExpired ? 'Expired' : 'Active') : 'Revoked'}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white capitalize text-xs">
                          {share.permission === 'download' ? 'View & Download' : 'View Only'}
                        </span>
                        <span className="text-[11px] text-gray-400">
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
