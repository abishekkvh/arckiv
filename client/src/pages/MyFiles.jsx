import { apiUrl, openDocument } from '../lib/api';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Files, 
  MagnifyingGlass, 
  SquaresFour, 
  ListBullets, 
  Funnel, 
  SortAscending, 
  UploadSimple, 
  Sparkle, 
  FilePdf, 
  File as FileIcon, 
  PencilSimple, 
  Trash, 
  ShareNetwork, 
  ClockCounterClockwise, 
  ChatTeardropText, 
  DownloadSimple, 
  ArrowRight,
  Eye
} from '@phosphor-icons/react';
import AnimatedText from '../components/ui/AnimatedText';
import DocumentCard from '../components/ui/DocumentCard';
import DocumentChatModal from '../components/ui/DocumentChatModal';
import DocumentEditModal from '../components/ui/DocumentEditModal';
import DocumentHistoryModal from '../components/ui/DocumentHistoryModal';
import DocumentShareModal from '../components/ui/DocumentShareModal';
import { useAuth } from '../contexts/AuthContext';

export default function MyFiles() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Search & Sort states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name, size
  const [viewMode, setViewMode] = useState('grid'); // grid, list

  // Modals state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedChatDoc, setSelectedChatDoc] = useState(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEditDoc, setSelectedEditDoc] = useState(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistoryDoc, setSelectedHistoryDoc] = useState(null);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedShareDoc, setSelectedShareDoc] = useState(null);

  // Sync URL search query
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const fetchDocuments = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(apiUrl('/api/documents'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [currentUser]);

  const handleViewDocument = async (doc) => {
    try {
      if (currentUser) {
        const token = await currentUser.getIdToken();
        fetch(apiUrl(`/api/documents/${doc._id}/view`), {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => console.error(err));
      }
    } catch (error) {
      console.error('Failed to record view:', error);
    }
    await openDocument(doc, currentUser);
  };

  const handleDeleteDocument = async (doc) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(apiUrl(`/api/documents/${doc._id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setDocuments(prev => prev.filter(d => d._id !== doc._id));
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  // Derive unique categories
  const categories = useMemo(() => {
    const set = new Set(['All']);
    documents.forEach(d => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set);
  }, [documents]);

  // Filtered & Sorted documents
  const filteredDocuments = useMemo(() => {
    return documents
      .filter(doc => {
        const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
        const q = searchQuery.toLowerCase().trim();
        if (!q) return matchesCategory;

        const nameMatch = doc.name.toLowerCase().includes(q);
        const catMatch = doc.category?.toLowerCase().includes(q);
        const tagsMatch = doc.tags?.some(t => t.toLowerCase().includes(q));
        const summaryMatch = doc.extractedData?.summary?.toLowerCase().includes(q);
        return matchesCategory && (nameMatch || catMatch || tagsMatch || summaryMatch);
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
        return 0;
      });
  }, [documents, searchQuery, selectedCategory, sortBy]);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <AnimatedText 
            text="Document Library" 
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-950 font-heading tracking-normal"
          />
          <p className="text-gray-500 mt-2 text-sm sm:text-base font-medium">
            Explore, filter, search, and manage all your verified documents in one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 border border-gray-200/80">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Grid View"
            >
              <SquaresFour size={16} weight="bold" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="List View"
            >
              <ListBullets size={16} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Search input, Category pills, Sort dropdown) */}
      <div className="glass-card p-4 sm:p-5 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          
          {/* Search bar inside page */}
          <div className="relative w-full sm:w-80">
            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} weight="bold" />
            <input
              type="text"
              placeholder="Filter by name, tags, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <SortAscending size={14} /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="size">File Size (Largest)</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' 
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200/80 text-gray-600'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Document Content View */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-white rounded-3xl border border-gray-200 p-6 h-96 animate-pulse space-y-4">
              <div className="h-44 bg-gray-100 rounded-2xl w-full"></div>
              <div className="h-5 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded w-full"></div>
              <div className="h-3 bg-gray-100 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 glass-card rounded-3xl border border-dashed border-gray-300 p-8 space-y-4 max-w-lg mx-auto"
        >
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
            <Files size={36} weight="duotone" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {searchQuery || selectedCategory !== 'All' ? 'No matching documents found' : 'Your document library is empty'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {searchQuery 
                ? `No documents matched "${searchQuery}". Try searching for broader categories or tags.` 
                : 'Upload your first invoice, certificate, identity, or academic record to get started.'}
            </p>
          </div>
          {(searchQuery || selectedCategory !== 'All') && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors"
            >
              Clear Filters
            </button>
          )}
        </motion.div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDocuments.map((doc, idx) => (
            <DocumentCard 
              key={doc._id} 
              doc={doc} 
              idx={idx} 
              onView={handleViewDocument} 
              onDelete={handleDeleteDocument} 
              onChat={(d) => { setSelectedChatDoc(d); setIsChatOpen(true); }}
              onEdit={(d) => { setSelectedEditDoc(d); setIsEditOpen(true); }}
              onHistory={(d) => { setSelectedHistoryDoc(d); setIsHistoryOpen(true); }}
              onShare={(d) => { setSelectedShareDoc(d); setIsShareOpen(true); }}
            />
          ))}
        </div>
      ) : (
        /* Compact List View */
        <div className="glass-card rounded-3xl border border-gray-200 overflow-hidden shadow-xs divide-y divide-gray-100">
          <div className="p-4 bg-gray-50/80 grid grid-cols-12 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            <div className="col-span-5 sm:col-span-4">Document</div>
            <div className="hidden sm:block col-span-3">Category & Summary</div>
            <div className="col-span-3 sm:col-span-2">Format & Size</div>
            <div className="col-span-4 sm:col-span-3 text-right">Actions</div>
          </div>
          {filteredDocuments.map((doc) => {
            const isPdf = doc.type?.includes('pdf');
            return (
              <div 
                key={doc._id}
                className="p-4 hover:bg-blue-50/40 grid grid-cols-12 items-center text-xs transition-colors gap-3"
              >
                <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-2xs shrink-0">
                    {isPdf ? <FilePdf size={18} className="text-red-500" /> : <FileIcon size={18} className="text-blue-600" />}
                  </div>
                  <span className="font-bold text-gray-900 truncate" title={doc.name}>{doc.name}</span>
                </div>

                <div className="hidden sm:block col-span-3 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 font-bold text-[10px] rounded-md inline-block">
                      {doc.category || 'Uncategorized'}
                    </span>
                    {doc.classification?.source === 'ml' && (
                      <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[9px] rounded-md">
                        ML {doc.classification.confidence ? `${Math.round(doc.classification.confidence * 100)}%` : ''}
                      </span>
                    )}
                    {doc.classification?.source === 'gemini' && (
                      <span className="px-1.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-semibold text-[9px] rounded-md">
                        Gemini
                      </span>
                    )}
                    {doc.classification?.source === 'manual' && (
                      <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 font-semibold text-[9px] rounded-md">
                        Manual
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">{doc.extractedData?.summary || '—'}</p>
                </div>

                <div className="col-span-3 sm:col-span-2 font-mono text-[11px] text-gray-500">
                  {(doc.size / 1024 / 1024).toFixed(2)} MB
                </div>

                <div className="col-span-4 sm:col-span-3 flex items-center justify-end gap-1.5">
                  <button 
                    onClick={() => handleViewDocument(doc)}
                    className="p-2 hover:bg-white text-gray-700 hover:text-blue-600 rounded-xl transition-colors"
                    title="View Document"
                  >
                    <Eye size={16} weight="bold" />
                  </button>
                  <button 
                    onClick={() => { setSelectedShareDoc(doc); setIsShareOpen(true); }}
                    className="p-2 hover:bg-white text-gray-700 hover:text-emerald-600 rounded-xl transition-colors"
                    title="Share"
                  >
                    <ShareNetwork size={16} weight="bold" />
                  </button>
                  <button 
                    onClick={() => { setSelectedEditDoc(doc); setIsEditOpen(true); }}
                    className="p-2 hover:bg-white text-gray-700 hover:text-indigo-600 rounded-xl transition-colors"
                    title="Edit Metadata"
                  >
                    <PencilSimple size={16} weight="bold" />
                  </button>
                  <button 
                    onClick={() => { setSelectedHistoryDoc(doc); setIsHistoryOpen(true); }}
                    className="p-2 hover:bg-white text-gray-700 hover:text-purple-600 rounded-xl transition-colors"
                    title="History Timeline"
                  >
                    <ClockCounterClockwise size={16} weight="bold" />
                  </button>
                  <button 
                    onClick={() => { if (window.confirm(`Delete "${doc.name}"?`)) handleDeleteDocument(doc); }}
                    className="p-2 hover:bg-white text-gray-700 hover:text-red-600 rounded-xl transition-colors"
                    title="Delete"
                  >
                    <Trash size={16} weight="bold" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <DocumentChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        document={selectedChatDoc}
        currentUser={currentUser}
      />

      <DocumentEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        document={selectedEditDoc}
        currentUser={currentUser}
        onSaved={(updatedDoc) => setDocuments(prev => prev.map(d => d._id === updatedDoc._id ? updatedDoc : d))}
      />

      <DocumentHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        document={selectedHistoryDoc}
        currentUser={currentUser}
      />

      <DocumentShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        document={selectedShareDoc}
        currentUser={currentUser}
      />
    </div>
  );
}
