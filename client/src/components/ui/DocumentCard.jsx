import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchDocumentBlob, openDocument } from '../../lib/api';
import { motion } from 'framer-motion';
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
  CalendarBlank
} from '@phosphor-icons/react';

export default function DocumentCard({ doc, idx, onView, onDelete, onChat, onEdit, onHistory, onShare }) {
  const { currentUser } = useAuth();
  const [previewUrl, setPreviewUrl] = useState('');
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
  const isPdf = doc.type?.includes('pdf');
  const isImage = doc.type?.includes('image');

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col bg-white rounded-3xl border border-gray-200/90 shadow-sm hover:shadow-xl hover:border-blue-300/80 transition-all duration-300 overflow-hidden h-[440px]"
    >
      {/* Top Media / Document Preview Frame */}
      <div className="relative h-56 bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center">
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
        <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
          <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md border border-white/20 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 shadow-sm">
            {isPdf ? <FilePdf size={13} className="text-red-400" /> : <FileIcon size={13} className="text-blue-400" />}
            <span>{isPdf ? 'PDF' : isImage ? 'IMAGE' : 'DOC'}</span>
          </span>

          {doc.category && (
            <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md text-gray-900 font-bold text-[10px] rounded-lg shadow-sm">
              {doc.category}
            </span>
          )}

          {doc.classification?.source === 'ml' && (
            <span
              className="px-2 py-1 bg-emerald-500/90 text-white font-bold text-[9px] rounded-lg shadow-sm tracking-wide"
              title={`ML Classification (${doc.classification.modelId || 'production'})${doc.classification.confidence ? ` - ${Math.round(doc.classification.confidence * 100)}% confidence` : ''}`}
            >
              ML {doc.classification.confidence ? `${Math.round(doc.classification.confidence * 100)}%` : ''}
            </span>
          )}
          {doc.classification?.source === 'gemini' && (
            <span
              className="px-2 py-1 bg-purple-500/90 text-white font-bold text-[9px] rounded-lg shadow-sm tracking-wide"
              title="Gemini Classification"
            >
              Gemini
            </span>
          )}
          {doc.classification?.source === 'manual' && (
            <span
              className="px-2 py-1 bg-amber-500/90 text-white font-bold text-[9px] rounded-lg shadow-sm tracking-wide"
              title="Manually Selected"
            >
              Manual
            </span>
          )}
        </div>

        {/* Top Action Hover Toolbar */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 transform -translate-y-1 group-hover:translate-y-0">
          <button 
            onClick={(e) => { e.stopPropagation(); if (onChat) onChat(doc); }}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-transform active:scale-90"
            title="Chat with Document"
          >
            <ChatTeardropText size={16} weight="bold" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); if (onShare) onShare(doc); }}
            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-transform active:scale-90"
            title="Share Document & QR"
          >
            <ShareNetwork size={16} weight="bold" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(doc); }}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-transform active:scale-90"
            title="Edit Document"
          >
            <PencilSimple size={16} weight="bold" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); if (onHistory) onHistory(doc); }}
            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md transition-transform active:scale-90"
            title="View History"
          >
            <ClockCounterClockwise size={16} weight="bold" />
          </button>
          <a 
            href="#" 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDocument(doc, currentUser, true); }}
            className="p-2 bg-white/90 hover:bg-white text-gray-900 rounded-xl shadow-md transition-transform active:scale-90"
            title="Download Original"
          >
            <DownloadSimple size={16} weight="bold" />
          </a>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete && window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) {
                onDelete(doc);
              }
            }}
            className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-transform active:scale-90"
            title="Delete"
          >
            <Trash size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Card Body & AI Metadata */}
      <div className="p-5 flex-1 flex flex-col justify-between bg-white">
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
            className="px-3.5 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 text-xs font-bold text-gray-800 hover:text-blue-600 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
          >
            <Eye size={14} weight="bold" />
            <span>Open</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
