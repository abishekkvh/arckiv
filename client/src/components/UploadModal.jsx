import { apiUrl } from '../lib/api';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadSimple, File, FilePdf, Sparkle, CheckCircle, PencilSimple, FloppyDisk } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';

export default function UploadModal({ isOpen, onClose, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, analyzing, complete, error
  const [uploadError, setUploadError] = useState('');
  const [result, setResult] = useState(null);
  const [analysisWarning, setAnalysisWarning] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ summary: '', tags: '' });
  const fileInputRef = useRef(null);
  const { currentUser } = useAuth();

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !currentUser) return;
    if (file.size > 10 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      setUploadError('Choose a PDF, JPEG, or PNG file up to 10 MB.'); setStatus('error'); return;
    }

    setStatus('uploading');
    setAnalysisWarning('');
    setUploadError('');
    
    try {
      const token = await currentUser.getIdToken();
      
      const formData = new FormData();
      formData.append('document', file);
      
      setStatus('analyzing');
      const response = await fetch(apiUrl('/api/documents/upload'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        signal: AbortSignal.timeout(180000)
      });




      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Upload failed. Please try again.');
      }
      
      const data = await response.json();
      setResult(data.document);
      setAnalysisWarning(data.aiAnalysis?.success === false ? data.aiAnalysis.error : '');
      setEditForm({
        summary: data.document.extractedData?.summary || '',
        tags: (data.document.tags || []).join(', ')
      });
      setStatus('complete');
      
    } catch (err) {

      console.error(err);
      setUploadError(err.name === 'TimeoutError' ? 'The server took too long. Check My Files before retrying to avoid a duplicate upload.' : err.message);
      setStatus('error');
    }
  };

  const handleSaveEdits = async () => {
    try {
      const token = await currentUser.getIdToken();
      const tagsArray = editForm.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      const response = await fetch(apiUrl(`/api/documents/${result._id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          summary: editForm.summary,
          tags: tagsArray
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.document);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to save edits', err);
    }
  };

  const handleFinish = () => {
    if (onUploadComplete && result) onUploadComplete(result);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setStatus('idle');
    setUploadError('');
    setResult(null);
    setIsEditing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[var(--surface)] w-full max-w-lg rounded-3xl border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-center p-6 border-b border-[var(--border)] shrink-0">
            <h2 className="text-xl font-bold text-[var(--foreground)]">Upload Document</h2>
            <button onClick={handleClose} disabled={status === 'uploading' || status === 'analyzing'} className="p-2 hover:bg-[var(--surface-hover)] rounded-full transition-colors text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50">
              <X size={20} weight="bold" />
            </button>
          </div>

          <div className="p-8 overflow-y-auto">
            {status === 'idle' && (
              <div className="space-y-6">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-3 border-dashed border-[var(--border)] hover:border-[var(--color-primary)] bg-[var(--surface-hover)] rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-[var(--color-primary)]/5 group"
                >
                  <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.png,.jpg,.jpeg" />
                  
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300">
                    <UploadSimple size={32} className="text-[var(--color-primary)]" weight="duotone" />
                  </div>
                  <h3 className="font-bold text-[var(--foreground)] text-lg">Click to select</h3>
                  <p className="text-sm font-medium text-[var(--muted)] mt-1">or drag and drop here</p>
                  <p className="text-xs font-semibold text-[var(--muted)]/70 mt-3 bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full">PDF, PNG, JPG up to 10MB</p>
                </div>

                {file && (
                  <div className="flex items-center justify-between p-4 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl">
                    <div className="flex items-center space-x-3 truncate">
                      {file.type.includes('pdf') ? <FilePdf size={28} className="text-red-500 shrink-0" weight="duotone" /> : <File size={28} className="text-blue-500 shrink-0" weight="duotone" />}
                      <span className="font-semibold text-sm truncate text-[var(--foreground)]">{file.name}</span>
                    </div>
                    <button onClick={handleUpload} className="px-5 py-2 bg-[var(--color-primary)] text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors shadow-md active:scale-95 shrink-0">
                      Upload
                    </button>
                  </div>
                )}
              </div>
            )}

            {(status === 'uploading' || status === 'analyzing') && (
              <div className="flex flex-col items-center justify-center py-10 space-y-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-[var(--color-primary)]/20 rounded-full animate-ping"></div>
                  <div className="p-4 bg-[var(--color-primary)]/10 rounded-full relative">
                    <Sparkle size={40} className="text-[var(--color-primary)] animate-pulse" weight="duotone" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[var(--foreground)] tracking-tight">Uploading and analyzing…</h3>
                <p className="text-sm font-medium text-[var(--muted)] text-center max-w-[250px]">
                  The free server may take a minute to wake up. AI analysis then takes up to 60 seconds. If AI is unavailable, your file is saved without AI metadata.
                </p>
                <div className="w-full max-w-xs bg-[var(--surface-hover)] rounded-full h-2.5 overflow-hidden border border-[var(--border)] mt-4">
                  <div className="bg-[var(--color-primary)] h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: '100%', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
                </div>
              </div>
            )}

            {status === 'complete' && result && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center space-y-5"
              >
                <CheckCircle size={48} className="text-green-500" weight="fill" />
                <h3 className="text-xl font-bold text-[var(--foreground)]">{analysisWarning ? 'Document saved' : 'Analysis Complete!'}</h3>
                {analysisWarning && <p role="status" className="text-sm text-amber-700 text-center">{analysisWarning}</p>}
                
                <div className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl p-5 space-y-4 text-left">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">AI Results</p>
                    {!isEditing && (
                      <button onClick={() => setIsEditing(true)} className="flex items-center space-x-1 text-[var(--color-primary)] text-xs font-bold hover:underline">
                        <PencilSimple size={14} weight="bold" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-[var(--muted)] mb-1 block">Summary</label>
                        <textarea 
                          className="w-full p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--color-primary)]" 
                          rows="3"
                          value={editForm.summary}
                          onChange={(e) => setEditForm({...editForm, summary: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[var(--muted)] mb-1 block">Tags (comma separated)</label>
                        <input 
                          type="text"
                          className="w-full p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--color-primary)]" 
                          value={editForm.tags}
                          onChange={(e) => setEditForm({...editForm, tags: e.target.value})}
                        />
                      </div>
                      <div className="flex justify-end space-x-2 pt-2">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--foreground)]">Cancel</button>
                        <button onClick={handleSaveEdits} className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors">
                          <FloppyDisk size={16} weight="bold" />
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm text-[var(--foreground)] font-medium leading-relaxed">{result.extractedData?.summary || 'No summary available.'}</p>
                      </div>
                      <div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {result.tags?.map(tag => (
                            <span key={tag} className="text-xs px-2.5 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold uppercase tracking-wider rounded-md border border-[var(--color-primary)]/20">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Key Information / Extracted Fields */}
                  {!isEditing && result.extractedData?.keyFields && Object.keys(result.extractedData.keyFields).length > 0 && (
                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)] mb-3 flex items-center gap-2">
                        Key Information
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(result.extractedData.keyFields).map(([key, value]) => {
                          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                          return (
                            <div key={key} className="col-span-1">
                              <p className="text-[10px] font-semibold text-[var(--muted)] mb-0.5 truncate" title={formattedKey}>{formattedKey}</p>
                              <p className="text-xs font-bold text-[var(--foreground)] truncate" title={String(value || 'Not available')}>
                                {value || 'Not available'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <button onClick={handleFinish} className="w-full py-3 bg-[var(--foreground)] text-[var(--surface)] font-bold rounded-xl hover:opacity-90 transition-opacity">
                    Finish & View Document
                  </button>
                )}
              </motion.div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="p-4 bg-red-100 text-red-500 rounded-full">
                  <X size={40} weight="bold" />
                </div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">Upload Failed</h3>
              <p role="alert" className="text-sm text-red-600 text-center">{uploadError}</p>
                <p className="text-sm text-[var(--muted)] text-center">Something went wrong while processing your document.</p>
                <button onClick={() => setStatus('idle')} className="mt-4 px-6 py-2 bg-[var(--surface-hover)] font-bold rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] transition-all">Try Again</button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
