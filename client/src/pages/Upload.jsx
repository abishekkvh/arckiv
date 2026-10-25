import { apiUrl } from '../lib/api';
import { useState, useRef } from 'react';
import { UploadSimple, FilePdf, File, X, Sparkle, CheckCircle, PencilSimple, FloppyDisk, ArrowRight } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AnimatedText from '../components/ui/AnimatedText';
import { useAuth } from '../contexts/AuthContext';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, analyzing, complete, error
  const [uploadError, setUploadError] = useState('');
  const [result, setResult] = useState(null);
  const [analysisWarning, setAnalysisWarning] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ summary: '', tags: '' });
  const fileInputRef = useRef(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
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

      console.error('Upload Error:', err);
      setUploadError(err.name === 'TimeoutError' ? 'The server took too long. Check My Files before retrying to avoid a duplicate upload.' : err.message);
      setStatus('error');
    }
  };

  const handleSaveEdits = async () => {
    if (!result || !currentUser) return;
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
      console.error('Failed to save edits:', err);
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus('idle');
    setUploadError('');
    setResult(null);
    setIsEditing(false);
    setEditForm({ summary: '', tags: '' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pt-6">
      <div>
        <AnimatedText text="Upload Document" className="text-4xl font-bold text-[var(--foreground)] font-heading tracking-normal" />
        <motion.p 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-[var(--muted)] mt-2 font-medium"
        >
          Upload files to let Arckiv's AI automatically classify and extract data.
        </motion.p>
      </div>

      <div className={status === 'complete' ? "block" : "grid grid-cols-1 md:grid-cols-2 gap-8"}>
        {/* Upload Area */}
        {status !== 'complete' && (
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="glass-card overflow-hidden"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-gray-100 rounded-full">
                  <UploadSimple size={22} weight="bold" className="text-gray-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)]">Upload files</h3>
                  <p className="text-xs font-medium text-[var(--muted)]">Select and upload the files of your choice</p>
                </div>
              </div>
            </div>

            {/* Drop Zone */}
            <div className="p-6">
              <div
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-[var(--color-primary)]', 'bg-blue-50/50'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('border-[var(--color-primary)]', 'bg-blue-50/50'); }}
                onDrop={(e) => { e.currentTarget.classList.remove('border-[var(--color-primary)]', 'bg-blue-50/50'); handleDrop(e); }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-[var(--color-primary)]/50 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all group bg-[var(--surface-hover)]/50"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={(e) => { if (e.target.files[0]) setFile(e.target.files[0]); }}
                  accept=".pdf,.png,.jpg,.jpeg"
                />
                <div className="p-3 bg-white rounded-full mb-4 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform duration-300">
                  <UploadSimple size={28} weight="duotone" className="text-gray-400 group-hover:text-[var(--color-primary)] transition-colors" />
                </div>
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">Choose a file or drag & drop it here</h3>
                <p className="text-sm text-[var(--muted)] mb-5">PDF, JPG, and PNG formats, up to 10MB</p>
                <span className="px-6 py-2 border border-gray-300 hover:border-gray-400 text-sm font-semibold text-[var(--foreground)] rounded-lg transition-colors bg-white shadow-sm">
                  Browse File
                </span>
              </div>
            </div>

            {/* Selected File Info (inside card) */}
            <AnimatePresence>
              {file && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mx-6 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="relative shrink-0">
                        <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                          {file.type?.includes('pdf') ? (
                            <FilePdf size={24} weight="duotone" className="text-gray-400" />
                          ) : (
                            <File size={24} weight="duotone" className="text-gray-400" />
                          )}
                        </div>
                        {file.type?.includes('pdf') && (
                          <span className="absolute -bottom-1 -left-1 text-[8px] font-bold bg-red-500 text-white px-1 py-0.5 rounded">PDF</span>
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{file.name}</p>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <p className="text-xs text-[var(--muted)]">{(file.size / 1024).toFixed(0)} KB</p>
                          {(status === 'uploading' || status === 'analyzing') && (
                            <p className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1">
                              <Sparkle size={10} weight="fill" className="animate-spin" />
                              {status === 'uploading' ? 'Uploading...' : 'Analyzing...'}
                            </p>
                          )}
                          {status === 'complete' && (
                            <p className="text-xs font-semibold text-green-600 flex items-center gap-1">
                              <CheckCircle size={12} weight="fill" />
                              Complete
                            </p>
                          )}
                        </div>
                        {(status === 'uploading' || status === 'analyzing') && (
                          <div className="w-40 bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div className="bg-[var(--color-primary)] h-1.5 rounded-full transition-all duration-300 ease-out" style={{ width: '100%', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
                          </div>
                        )}
                      </div>
                    </div>
                    {status === 'idle' && (
                      <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0">
                        <X size={18} weight="bold" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Upload Button (outside card) */}
          {file && status === 'idle' && (
            <motion.button 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              onClick={handleUpload}
              className="w-full bg-[var(--color-primary)] hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Sparkle size={22} weight="duotone" />
              <span>Upload & Process with AI</span>
            </motion.button>
          )}

          {/* Error State */}
          {status === 'error' && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass-card p-8 flex flex-col items-center justify-center space-y-4 border border-red-200"
            >
              <div className="p-4 bg-red-100 text-red-500 rounded-full">
                <X size={32} weight="bold" />
              </div>
              <h3 className="text-lg font-bold text-[var(--foreground)]">Upload Failed</h3>
              <p role="alert" className="text-sm text-red-600 text-center">{uploadError}</p>
              <p className="text-sm text-[var(--muted)] text-center">Something went wrong while processing your document.</p>
              <button onClick={handleReset} className="px-6 py-2 bg-[var(--surface-hover)] font-bold rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] transition-all">
                Try Again
              </button>
            </motion.div>
          )}
        </div>
        )}

        {/* Results Area */}
        <div className={status === 'complete' ? "w-full" : "relative h-full min-h-[400px]"}>
          {status === 'complete' && result ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-6 h-full border-l-4 border-l-green-500 shadow-md"
            >
              <div className="flex items-center space-x-4 mb-8 border-b border-[var(--border)] pb-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-2.5 rounded-full text-green-600 dark:text-green-400">
                  <CheckCircle size={28} weight="fill" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--foreground)]">{analysisWarning ? 'Document saved' : 'Analysis Complete'}</h3>
                  <p className="text-sm font-medium text-[var(--muted)]">{analysisWarning || 'Successfully extracted metadata'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* File Info */}
                <div className={isEditing ? "md:col-span-3 bg-[var(--surface-hover)] border border-[var(--border)] p-5 rounded-2xl space-y-4" : "md:col-span-2 bg-[var(--surface-hover)] border border-[var(--border)] p-5 rounded-2xl space-y-4 h-fit"}>
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)] flex items-center gap-2">
                      <FilePdf size={16} weight="duotone" /> Extracted Data
                    </h4>
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
                      <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2">
                          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">Name</p>
                          <p className="text-sm font-bold text-[var(--foreground)]">{result.name}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">Category</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-[var(--foreground)]">{result.category || 'Uncategorized'}</p>
                            {result.classification?.source === 'ml' && (
                              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-[10px] rounded-full">
                                ML Classification {result.classification.confidence ? `(${Math.round(result.classification.confidence * 100)}%)` : ''}
                              </span>
                            )}
                            {result.classification?.source === 'gemini' && (
                              <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 font-semibold text-[10px] rounded-full">
                                Gemini Classification
                              </span>
                            )}
                            {result.classification?.source === 'manual' && (
                              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold text-[10px] rounded-full">
                                Manually Selected
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">Size</p>
                          <p className="text-sm font-bold text-[var(--foreground)]">{(result.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">Summary</p>
                          <p className="text-sm font-medium text-[var(--foreground)] leading-relaxed">{result.extractedData?.summary || 'No summary available.'}</p>
                        </div>
                      </div>
                      
                      {/* Key Information / Extracted Fields */}
                      {!isEditing && result.extractedData?.keyFields && Object.keys(result.extractedData.keyFields).length > 0 && (
                        <div className="mt-6 border-t border-[var(--border)] pt-5">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)] mb-4 flex items-center gap-2">
                            Key Information
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(result.extractedData.keyFields).map(([key, value]) => {
                              // Format camelCase keys to Title Case
                              const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                              return (
                                <div key={key} className="col-span-1">
                                  <p className="text-xs font-semibold text-[var(--muted)] mb-1 truncate" title={formattedKey}>{formattedKey}</p>
                                  <p className="text-sm font-bold text-[var(--foreground)] truncate" title={typeof value === 'object' ? JSON.stringify(value) : String(value || 'Not available')}>
                                    {typeof value === 'object' ? JSON.stringify(value) : (value || 'Not available')}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Tags */}
                  {!isEditing && result.tags?.length > 0 && (
                    <div className="bg-[var(--surface-hover)] border border-[var(--border)] p-5 rounded-2xl space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)] flex items-center gap-2">
                        <Sparkle size={16} weight="duotone" /> Generated Tags
                      </h4>
                      <div className="flex flex-wrap gap-2.5">
                        {result.tags.map(tag => (
                          <span key={tag} className="px-3 py-1.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!isEditing && (
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => navigate('/my-files')}
                        className="w-full bg-[var(--foreground)] text-[var(--surface)] font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
                      >
                        <span>View in My Files</span>
                        <ArrowRight size={18} weight="bold" />
                      </button>
                      <button 
                        onClick={handleReset}
                        className="w-full border-2 border-[var(--border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 text-[var(--foreground)] font-bold py-3 rounded-xl transition-all shadow-sm active:scale-95"
                      >
                        Upload Another
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
              className="glass-card h-full flex flex-col items-center justify-center text-center p-8 opacity-60 border-dashed bg-gradient-to-b from-[var(--surface)] to-transparent"
            >
              <div className="p-4 bg-[var(--surface-hover)] rounded-full mb-4">
                <Sparkle size={48} weight="duotone" className="text-[var(--muted)]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">AI Extraction Ready</h3>
              <p className="text-sm font-medium text-[var(--muted)] max-w-[250px]">Upload a document to see the automated OCR and classification in action.</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
