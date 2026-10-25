import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchDocumentBlob, openDocument } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Sparkle, 
  HardDrives, 
  DownloadSimple, 
  Trash, 
  FilePdf, 
  File as FileIcon, 
  ChatTeardropText, 
  PencilSimple, 
  ClockCounterClockwise, 
  ShareNetwork,
  Eye,
  CalendarBlank,
  DotsThreeVertical
} from '@phosphor-icons/react';

export default function DocumentCard({ doc, idx, onView, onDelete, onChat, onEdit, onHistory, onShare }) {
  const { currentUser } = useAuth();
  const [previewUrl, setPreviewUrl] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    let disposed = false;
    let url;
    if (currentUser) fetchDocumentBlob(doc, currentUser).then(value => {
      url = value;
      if (disposed) URL.revokeObjectURL(value);
      else setPreviewUrl(value);
    }).catch(() => setPreviewUrl(''));
    return () => { disposed = true; if (url) URL.revokeObjectURL(url); };
  }, [doc._id, currentUser]);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const isPdf = doc.type?.includes('pdf');
  const isImage = doc.type?.includes('image');

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col bg-white rounded-3xl border border-gray-200/90 shadow-sm hover:shadow-xl hover:border-blue-300/80 transition-all duration-300 overflow-hidden ${menuOpen ? 'z-30' : 'z-0'} h-[440px]`}
    >
      {/* Top Media / Document Preview Frame */}
      <div className="relative h-56 bg-slate-900 rounded-t-3xl overflow-hidden shrink-0 flex items-center justify-center">
        {isPdf && previewUrl ? (
          <div className="absolute inset-0 bg-white overflow-hidden pointer-events-none">
            <iframe 
              src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} 
              className="w-full h-[160%] pointer-events-none scale-105 origin-top opacity-90 group-hover:opacity-100 transition-opacity duration-300"
              title={doc.name}
              frameBorder="0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 group-hover:from-black/40 transition-colors duration-300" />
          </div>
        ) : isImage && previewUrl ? (
          <div className="relative w-full h-full">
            <img 
              src={previewUrl} 
              alt={doc.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 group-hover:from-black/40 transition-colors duration-300" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
            <FileIcon size={80} weight="duotone" className="text-white/20 group-hover:scale-110 transition-transform duration-500" />
          </div>
        )}

        {/* Top Badges (Category & MIME Pill) */}
        <div className="absolute top-4 left-4 right-16 flex items-center gap-2 z-10 flex-wrap pointer-events-none">
          <span className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/20 text-white font-bold text-[10px] rounded-full flex items-center gap-1.5 shadow-sm">
            {isPdf ? <FilePdf size={13} className="text-red-400" /> : <FileIcon size={13} className="text-blue-400" />}
            <span>{isPdf ? 'PDF' : isImage ? 'IMAGE' : 'DOC'}</span>
          </span>

          {doc.category && (
            <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-gray-900 font-bold text-[10px] rounded-full shadow-sm truncate max-w-[130px]" title={doc.category}>
              {doc.category}
            </span>
          )}

          {doc.classification?.source === 'ml' && (
            <span
              className="px-2.5 py-1 bg-emerald-500/90 text-white font-bold text-[9px] rounded-full shadow-sm tracking-wide"
              title={`ML Classification (${doc.classification.modelId || 'production'})${doc.classification.confidence ? ` - ${Math.round(doc.classification.confidence * 100)}% confidence` : ''}`}
            >
              ML {doc.classification.confidence ? `${Math.round(doc.classification.confidence * 100)}%` : ''}
            </span>
          )}
          {doc.classification?.source === 'gemini' && (
            <span
              className="px-2.5 py-1 bg-purple-500/90 text-white font-bold text-[9px] rounded-full shadow-sm tracking-wide"
              title="Gemini Classification"
            >
              Gemini
            </span>
          )}
          {doc.classification?.source === 'manual' && (
            <span
              className="px-2.5 py-1 bg-amber-500/90 text-white font-bold text-[9px] rounded-full shadow-sm tracking-wide"
              title="Manually Selected"
            >
              Manual
            </span>
          )}
        </div>
      </div>

      {/* Top Action Three-Dot Dropdown */}
      <div ref={menuRef} className="absolute top-4 right-4 z-20">
        <button 
          type="button"
          onClick={(e) => { 
            e.stopPropagation(); 
            setMenuOpen((prev) => !prev); 
          }}
          className={`w-9 h-9 rounded-full backdrop-blur-md transition-all duration-200 flex items-center justify-center shadow-md active:scale-95 ${
            menuOpen 
              ? 'bg-white text-gray-950 shadow-lg ring-2 ring-blue-500/30' 
              : 'bg-black/45 hover:bg-black/70 text-white/95 border border-white/20'
          }`}
          title="Document options"
          aria-label="Document options"
          aria-expanded={menuOpen}
        >
          <DotsThreeVertical size={18} weight="bold" />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white/95 backdrop-blur-xl border border-gray-200/90 shadow-2xl p-1.5 z-30 ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                type="button"
                onClick={() => { setMenuOpen(false); if (onChat) onChat(doc); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ChatTeardropText size={16} weight="bold" />
                </div>
                <span>Chat with AI</span>
              </button>

              <button 
                type="button"
                onClick={() => { setMenuOpen(false); if (onShare) onShare(doc); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-emerald-600 hover:bg-emerald-50/80 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShareNetwork size={16} weight="bold" />
                </div>
                <span>Share & QR</span>
              </button>

              <button 
                type="button"
                onClick={() => { setMenuOpen(false); if (onEdit) onEdit(doc); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-indigo-600 hover:bg-indigo-50/80 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <PencilSimple size={16} weight="bold" />
                </div>
                <span>Edit Details</span>
              </button>

              <button 
                type="button"
                onClick={() => { setMenuOpen(false); if (onHistory) onHistory(doc); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-purple-600 hover:bg-purple-50/80 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <ClockCounterClockwise size={16} weight="bold" />
                </div>
                <span>Audit History</span>
              </button>

              <button 
                type="button"
                onClick={() => { setMenuOpen(false); openDocument(doc, currentUser, true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-gray-950 hover:bg-gray-100/80 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                  <DownloadSimple size={16} weight="bold" />
                </div>
                <span>Download Original</span>
              </button>

              <div className="my-1 border-t border-gray-100" />

              <button 
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (onDelete && window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) {
                    onDelete(doc);
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash size={16} weight="bold" />
                </div>
                <span>Delete</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card Body & AI Metadata */}
      <div className="p-5 flex-1 flex flex-col justify-between bg-white rounded-b-3xl">
        <div className="space-y-2">
          <h3 className="font-bold text-base text-gray-950 truncate tracking-tight" title={doc.name}>
            {doc.name}
          </h3>
          
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
            {doc.extractedData?.summary || (doc.tags?.length > 0 ? `Tags: ${doc.tags.join(', ')}` : 'No automated summary available.')}
          </p>
        </div>

        {/* Card Footer: Metadata info & View Trigger */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400">
            <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
            {doc.expiryDate && (
              <span className="text-amber-600 font-semibold flex items-center gap-1" title="Expiry Date">
                <CalendarBlank size={12} weight="bold" />
                {new Date(doc.expiryDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          <button 
            onClick={() => onView ? onView(doc) : openDocument(doc, currentUser)}
            className="px-4 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 text-xs font-bold text-gray-800 hover:text-blue-600 rounded-full transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
          >
            <Eye size={14} weight="bold" />
            <span>Open</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
