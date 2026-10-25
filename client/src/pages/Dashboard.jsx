import { apiUrl, openDocument } from '../lib/api';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Files, 
  HardDrives, 
  Clock, 
  UploadSimple, 
  ArrowRight, 
  Sparkle, 
  Folders, 
  ClockCounterClockwise, 
  FilePdf, 
  Image as ImageIcon, 
  FileText, 
  Tag as TagIcon, 
  ShieldCheck, 
  ArrowsClockwise, 
  PencilSimple, 
  ShareNetwork, 
  Prohibit, 
  Trash, 
  CalendarBlank,
  ChartPieSlice,
  Lightning
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import AnimatedText from '../components/ui/AnimatedText';
import CountUp from '../components/ui/CountUp';
import CardSpotlight from '../components/ui/CardSpotlight';
import UploadModal from '../components/UploadModal';
import DocumentCard from '../components/ui/DocumentCard';
import DocumentChatModal from '../components/ui/DocumentChatModal';
import DocumentEditModal from '../components/ui/DocumentEditModal';
import DocumentHistoryModal from '../components/ui/DocumentHistoryModal';
import DocumentShareModal from '../components/ui/DocumentShareModal';
import { useAuth } from '../contexts/AuthContext';

function formatDate(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(ts));
}

function formatRelativeTime(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ActionBadge({ action }) {
  switch (action) {
    case 'UPLOAD':
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1"><UploadSimple size={12} weight="bold" /> Uploaded</span>;
    case 'EDIT':
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1"><PencilSimple size={12} weight="bold" /> Edited</span>;
    case 'SHARE':
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100 flex items-center gap-1"><ShareNetwork size={12} weight="bold" /> Shared</span>;
    case 'UNSHARE':
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1"><Prohibit size={12} weight="bold" /> Revoked</span>;
    case 'DELETE':
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100 flex items-center gap-1"><Trash size={12} weight="bold" /> Deleted</span>;
    default:
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">{action}</span>;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [documents, setDocuments] = useState([]);
  
  // AI Insights State
  const [insights, setInsights] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedChatDoc, setSelectedChatDoc] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEditDoc, setSelectedEditDoc] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistoryDoc, setSelectedHistoryDoc] = useState(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedShareDoc, setSelectedShareDoc] = useState(null);

  // Fetch Dashboard Stats
  const fetchDashboardData = async () => {
    if (!currentUser) return;
    setLoadingStats(true);
    try {
      const token = await currentUser.getIdToken();
      const [statsRes, docsRes] = await Promise.all([
        fetch(apiUrl('/api/dashboard/stats'), { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(apiUrl('/api/documents'), { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        setStatsData(statsJson);
        if (statsJson.aiInsights && statsJson.aiInsights.length > 0) {
          setInsights(statsJson.aiInsights);
        } else {
          fetchInsights(token);
        }
      }

      if (docsRes.ok) {
        const docsJson = await docsRes.json();
        setDocuments(docsJson);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Asynchronously fetch / refresh AI insights
  const fetchInsights = async (tokenOverride, forceRefresh = false) => {
    setLoadingInsights(true);
    try {
      const token = tokenOverride || (currentUser ? await currentUser.getIdToken() : null);
      if (!token) return;
      const res = await fetch(apiUrl(`/api/dashboard/insights${forceRefresh ? '?refresh=true' : ''}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
      }
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const handleUploadComplete = (newDoc) => {
    setDocuments(prev => [newDoc, ...prev]);
    fetchDashboardData();
  };

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
      const res = await fetch(apiUrl(`/api/documents/${doc._id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d._id !== doc._id));
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  const overview = statsData?.overview || {
    totalDocuments: documents.length,
    totalStorageMB: (documents.reduce((acc, d) => acc + (d.size || 0), 0) / (1024 * 1024)).toFixed(2)
  };

  const categories = statsData?.categories || [];
  const fileTypes = statsData?.fileTypes || [];
  const topTags = statsData?.tags || [];
  const recentActivity = statsData?.recentActivity || [];
  const expiringDocuments = statsData?.expiringDocuments || [];

  return (
    <div className="space-y-10 pb-16">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest">
              Live Workspace
            </span>
          </div>
          <AnimatedText 
            text={`Welcome back, ${userName}`} 
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-950 font-heading tracking-normal"
          />
          <p className="text-gray-500 mt-2 text-sm sm:text-base font-medium">
            Intelligence overview, document vectors, and audit trails across your workspace.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <UploadSimple size={16} weight="bold" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Top 4 Key Metric Cards (CardSpotlight + CountUp) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Documents */}
        <CardSpotlight className="glass-card p-6 rounded-3xl border border-gray-200/90 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Indexed</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Files size={20} weight="duotone" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold text-gray-950 font-heading">
              <CountUp to={overview.totalDocuments} />
            </h3>
            <span className="text-xs font-semibold text-gray-400">files</span>
          </div>
        </CardSpotlight>

        {/* Card 2: Total Storage */}
        <CardSpotlight className="glass-card p-6 rounded-3xl border border-gray-200/90 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Storage Footprint</p>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <HardDrives size={20} weight="duotone" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold text-gray-950 font-heading">
              <CountUp to={overview.totalStorageMB} decimals={2} />
            </h3>
            <span className="text-xs font-semibold text-gray-400">MB</span>
          </div>
        </CardSpotlight>

        {/* Card 3: Categories */}
        <CardSpotlight className="glass-card p-6 rounded-3xl border border-gray-200/90 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Categories</p>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Folders size={20} weight="duotone" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold text-gray-950 font-heading">
              <CountUp to={categories.length} />
            </h3>
            <span className="text-xs font-semibold text-gray-400">active</span>
          </div>
        </CardSpotlight>

        {/* Card 4: Audit History Events */}
        <CardSpotlight className="glass-card p-6 rounded-3xl border border-gray-200/90 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Audit Provenance</p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ClockCounterClockwise size={20} weight="duotone" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold text-gray-950 font-heading">
              <CountUp to={recentActivity.length} />
            </h3>
            <span className="text-xs font-semibold text-gray-400">events</span>
          </div>
        </CardSpotlight>
      </div>

      {/* AI Intelligence & Insights Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="glass-card p-6 sm:p-8 rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 shadow-md relative overflow-hidden"
      >
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/25">
              <Sparkle size={22} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-gray-950 tracking-tight">AI Collection Intelligence</h2>
                <span className="px-2 py-0.5 bg-blue-100/70 text-blue-700 font-mono font-bold text-[10px] rounded-full uppercase">Gemini 2.5</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Automated observations interpreted from workspace metadata</p>
            </div>
          </div>

          <button
            onClick={() => fetchInsights(null, true)}
            disabled={loadingInsights}
            className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl text-gray-700 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50"
            title="Generate fresh AI observations"
          >
            <ArrowsClockwise size={14} className={loadingInsights ? 'animate-spin text-blue-600' : ''} />
            <span className="hidden sm:inline">{loadingInsights ? 'Analyzing...' : 'Refresh'}</span>
          </button>
        </div>

        {loadingInsights && insights.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/80 p-5 rounded-2xl border border-gray-100 animate-pulse space-y-2.5">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-100 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-200/70 flex items-start gap-3.5 shadow-xs hover:border-blue-200 transition-colors"
              >
                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 border border-blue-100">
                  {idx + 1}
                </span>
                <p className="text-xs sm:text-sm font-medium text-gray-800 leading-relaxed">
                  {insight}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Visual Analytics & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): Category Distribution & File Type Distribution */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Category Distribution Card */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Folders size={20} weight="bold" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-950">Category Distribution</h3>
                  <p className="text-xs text-gray-500">Distribution across organizational classifications</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                {categories.length} Categories
              </span>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 italic">No category data recorded yet.</div>
            ) : (
              <div className="space-y-4">
                {categories.map((cat, idx) => {
                  const percentage = overview.totalDocuments > 0 ? Math.round((cat.count / overview.totalDocuments) * 100) : 0;
                  return (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          {cat.name}
                        </span>
                        <div className="flex items-center gap-3 text-gray-500 font-medium">
                          <span className="font-mono text-[11px]">{cat.sizeMB} MB</span>
                          <span className="font-bold text-gray-900">{cat.count} doc{cat.count > 1 ? 's' : ''} ({percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.05 }}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* File Types & Tag Analytics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* File Type Distribution */}
            <div className="glass-card p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2.5">
                <FilePdf size={20} weight="bold" className="text-red-500" />
                <h3 className="text-sm font-bold text-gray-950">Format Breakdown</h3>
              </div>

              {fileTypes.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4 text-center">No file formats recorded.</p>
              ) : (
                <div className="space-y-2.5">
                  {fileTypes.map(f => {
                    const pct = overview.totalDocuments > 0 ? Math.round((f.count / overview.totalDocuments) * 100) : 0;
                    return (
                      <div key={f.type} className="p-3 bg-gray-50/80 rounded-2xl border border-gray-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-900">{f.type}</span>
                        <div className="flex items-center gap-2 text-gray-500 font-mono text-[11px]">
                          <span>{f.sizeMB} MB</span>
                          <span className="px-2 py-0.5 rounded-md bg-white font-bold text-gray-900 border border-gray-200">
                            {f.count} ({pct}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Tags Cloud */}
            <div className="glass-card p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2.5">
                <TagIcon size={20} weight="bold" className="text-purple-600" />
                <h3 className="text-sm font-bold text-gray-950">Top AI Tags</h3>
              </div>

              {topTags.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4 text-center">No tags assigned yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topTags.map((tag) => (
                    <span 
                      key={tag.name}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 rounded-xl text-xs font-semibold text-gray-800 flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <span>{tag.name}</span>
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-mono font-bold flex items-center justify-center">
                        {tag.count}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Recent Activity & Expiring Documents */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Expiring Documents (if any present) */}
          {expiringDocuments.length > 0 && (
            <div className="glass-card p-6 rounded-3xl border-l-4 border-l-amber-500 space-y-4">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
                <CalendarBlank size={18} weight="bold" />
                <span>Upcoming Expirations</span>
              </div>
              <div className="space-y-2">
                {expiringDocuments.map(doc => (
                  <div key={doc._id} className="p-3 bg-amber-50/40 rounded-xl border border-amber-100 flex items-center justify-between text-xs">
                    <div className="truncate min-w-0 pr-2">
                      <p className="font-bold text-gray-900 truncate">{doc.name}</p>
                      <p className="text-[10px] text-gray-500">{doc.category}</p>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-amber-700 shrink-0">
                      {new Date(doc.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity Timeline Feed (Feature 4 DocumentHistory Integration) */}
          <div className="glass-card p-6 rounded-3xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ClockCounterClockwise size={20} weight="bold" className="text-blue-600" />
                <h3 className="text-sm font-bold text-gray-950">Recent Activity</h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">Latest 10</span>
            </div>

            {recentActivity.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-6 text-center">No recorded activity yet.</p>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {recentActivity.map((act) => (
                  <div key={act._id} className="p-3 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <ActionBadge action={act.action} />
                      <span className="text-[10px] font-mono text-gray-400" title={formatDate(act.createdAt)}>
                        {formatRelativeTime(act.createdAt)}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate" title={act.documentName}>
                      {act.documentName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Access to Recent Files */}
      {documents.length > 0 && (
        <div className="space-y-6 pt-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Clock size={22} weight="bold" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-950 tracking-tight">Recent Documents</h2>
                <p className="text-xs font-medium text-gray-500 mt-0.5">Quick access to newest files in your library</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/my-files')}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5"
            >
              <span>Explore all files in library</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...documents]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 3)
              .map((doc, idx) => (
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
        </div>
      )}

      {/* Modals */}
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onUploadComplete={handleUploadComplete} 
      />

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
        onSaved={() => fetchDashboardData()}
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
