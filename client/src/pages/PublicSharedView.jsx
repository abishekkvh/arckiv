import { apiUrl } from '../lib/api';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FilePdf, 
  File as FileIcon, 
  DownloadSimple, 
  Clock, 
  ShieldCheck, 
  WarningCircle, 
  Sparkle, 
  HardDrives, 
  ArrowSquareOut,
  Tag,
  Key
} from '@phosphor-icons/react';

export default function PublicSharedView() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSharedDoc = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiUrl(`/api/shared/${token}`));
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'This shared document link has expired or has been revoked.');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSharedDoc();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold text-[var(--muted)] animate-pulse">Decrypting and loading shared document...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] p-8 rounded-3xl shadow-xl space-y-4"
        >
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
            <WarningCircle size={36} weight="duotone" />
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Access Unavailable</h2>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            {error || 'This shared document link has expired or has been revoked.'}
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-6 py-2.5 bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-bold rounded-xl text-[var(--foreground)] hover:bg-[var(--surface)] transition-all"
            >
              Go to Arckiv Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const { document: doc, share } = data;
  const fileUrl = apiUrl(data.fileUrl);
  const isPdf = doc.type?.includes('pdf');
  const isImage = doc.type?.includes('image');
  const downloadUrl = apiUrl(`/api/shared/${token}/file?download=1`);

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[var(--foreground)] tracking-tight">Arckiv</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] rounded-full uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck size={12} weight="fill" />
                Secure Share
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)] flex items-center gap-1">
              <Clock size={12} />
              Expires {new Date(share.expiresAt).toLocaleDateString()} at {new Date(share.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[var(--surface-hover)] border border-[var(--border)] hover:bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <ArrowSquareOut size={15} weight="bold" />
            <span className="hidden sm:inline">Fullscreen</span>
          </a>

          {share.permission === 'download' && (
            <a
              href={downloadUrl}
              download={doc.name}
              className="px-4 py-2 bg-[var(--color-primary)] hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95"
            >
              <DownloadSimple size={15} weight="bold" />
              <span>Download</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Document Viewer Frame */}
        <div className="lg:col-span-8 flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-lg h-[650px] lg:h-[calc(100vh-140px)]">
          <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-hover)]/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {isPdf ? (
                <FilePdf size={22} weight="duotone" className="text-red-500 shrink-0" />
              ) : (
                <FileIcon size={22} weight="duotone" className="text-blue-500 shrink-0" />
              )}
              <h1 className="font-bold text-sm text-[var(--foreground)] truncate" title={doc.name}>
                {doc.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {doc.category && (
                <span className="px-2.5 py-1 bg-white dark:bg-gray-800 border border-[var(--border)] text-[11px] font-semibold text-[var(--muted)] rounded-lg">
                  {doc.category}
                </span>
              )}
              <span className="px-2.5 py-1 bg-white dark:bg-gray-800 border border-[var(--border)] text-[11px] font-semibold text-[var(--muted)] rounded-lg">
                {(doc.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          </div>

          <div className="flex-1 bg-gray-900/5 dark:bg-black/40 overflow-hidden relative flex items-center justify-center p-2">
            {isPdf ? (
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full rounded-xl border border-[var(--border)] bg-white"
                title={doc.name}
              />
            ) : isImage ? (
              <img
                src={fileUrl}
                alt={doc.name}
                className="max-w-full max-h-full object-contain rounded-xl shadow-md"
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <FileIcon size={64} weight="duotone" className="text-[var(--muted)] mx-auto" />
                <h3 className="text-base font-bold text-[var(--foreground)]">{doc.name}</h3>
                <p className="text-xs text-[var(--muted)]">Preview not directly available in browser for this file type.</p>
                {share.permission === 'download' && (
                  <a
                    href={downloadUrl}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white text-xs font-bold rounded-xl shadow-md"
                  >
                    <DownloadSimple size={16} weight="bold" />
                    <span>Download File</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Document Details & AI Insights Sidebar */}
        <div className="lg:col-span-4 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
          {/* AI Summary Card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-wider">
              <Sparkle size={16} weight="fill" />
              <span>AI Document Summary</span>
            </div>
            <p className="text-xs font-medium text-[var(--foreground)] leading-relaxed">
              {doc.summary || 'No AI summary was generated for this document.'}
            </p>
          </div>

          {/* Key Information OCR Entities */}
          {doc.keyFields && Object.keys(doc.keyFields).length > 0 && (
            <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-xs uppercase tracking-wider">
                <Key size={16} weight="bold" />
                <span>Extracted Key Fields</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                {Object.entries(doc.keyFields).map(([k, v]) => {
                  const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v || '—');
                  return (
                    <div key={k} className="bg-[var(--surface-hover)] p-3 rounded-xl border border-[var(--border)]">
                      <p className="text-[11px] font-semibold text-[var(--muted)] truncate">{label}</p>
                      <p className="text-xs font-bold text-[var(--foreground)] truncate mt-0.5" title={valStr}>{valStr}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {doc.tags && doc.tags.length > 0 && (
            <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-3xl shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-[var(--muted)] font-bold text-xs uppercase tracking-wider">
                <Tag size={16} weight="bold" />
                <span>Categorization Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {doc.tags.map((t) => (
                  <span key={t} className="px-3 py-1 bg-[var(--surface-hover)] border border-[var(--border)] text-[11px] font-semibold text-[var(--foreground)] rounded-lg">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3">
            <ShieldCheck size={20} weight="fill" className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-[11px] text-[var(--muted)] leading-relaxed">
              <span className="font-bold text-[var(--foreground)] block mb-0.5">Time-Protected Link</span>
              This link is secured by cryptographic token validation and will automatically deactivate upon expiration.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
