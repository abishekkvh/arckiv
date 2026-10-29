import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SquaresFour, 
  Users, 
  Files, 
  Cpu, 
  ShieldCheck, 
  ArrowClockwise, 
  Hexagon,
  ArrowSquareOut,
  SidebarSimple,
  List,
  X,
  CaretRight
} from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import OverviewSection from '../components/admin/OverviewSection';
import UsersSection from '../components/admin/UsersSection';
import DocumentsSection from '../components/admin/DocumentsSection';
import MLIntelligenceSection from '../components/admin/MLIntelligenceSection';

const NAVIGATION_GROUPS = [
  {
    title: 'WORKSPACE',
    items: [
      { id: 'overview', label: 'Command Overview', icon: SquaresFour, description: 'Executive KPIs, upload trends & authority split' },
      { id: 'users', label: 'Users Center', icon: Users, description: 'User accounts, permissions & lifecycle status' },
      { id: 'documents', label: 'Global Documents', icon: Files, description: 'Vault-wide document inventory & privacy inspection' },
    ],
  },
  {
    title: 'AI INTELLIGENCE',
    items: [
      { id: 'ml-intelligence', label: 'ML Decision Explorer', icon: Cpu, description: '11-stage inference pipeline & gating traces' },
    ],
  },
];

export default function Admin() {
  const { currentUser, dbUser } = useAuth();
  const [tab, setTab] = useState('overview');
  const [revision, setRevision] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeInferenceId, setActiveInferenceId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRevision((n) => n + 1);
    setTimeout(() => setIsRefreshing(false), 600);
  }, []);

  const handleJumpToInference = (inferenceId) => {
    setActiveInferenceId(inferenceId);
    setTab('ml-intelligence');
  };

  // Find active tab info
  let activeTabInfo = { label: 'Command Overview', description: 'Real-time telemetry and operational statistics' };
  for (const group of NAVIGATION_GROUPS) {
    const found = group.items.find((i) => i.id === tab);
    if (found) {
      activeTabInfo = found;
      break;
    }
  }

  if (!dbUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
            <ShieldCheck size={32} weight="duotone" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Administrator Access Required</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            This administrative control center is restricted to verified owner-administrator identities with authorized server custom claims.
          </p>
          <div className="pt-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <span>Return to User Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sectionProps = {
    user: currentUser,
    revision,
    onRefresh: handleRefresh,
    onNavigate: setTab,
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 font-sans antialiased">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden cursor-pointer"
        />
      )}

      {/* ── LEFT OBSIDIAN SIDEBAR ────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0B1220] border-r border-[#162032] text-slate-300 transition-all duration-300 select-none ${
          mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-[252px]'}`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-5 border-b border-[#162032] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white shrink-0">
              <Hexagon size={20} weight="fill" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-sm tracking-tight text-white truncate">
                    Arckiv
                  </span>
                  <span className="px-1.5 py-0.2 rounded-md bg-blue-500/15 border border-blue-400/30 text-blue-400 text-[10px] font-mono font-bold tracking-wider">
                    V4
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">Command Center</p>
              </div>
            )}
          </div>

          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 no-scrollbar">
          {NAVIGATION_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              {!sidebarCollapsed ? (
                <div className="px-3 pb-1 text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
                  {group.title}
                </div>
              ) : (
                <div className="h-2" />
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTab(item.id);
                      if (item.id !== 'ml-intelligence') setActiveInferenceId(null);
                      setMobileMenuOpen(false);
                    }}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#111C30]'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon size={18} weight={isActive ? 'fill' : 'duotone'} className="shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer / Admin Identity & Exit Action */}
        <div className="p-3 border-t border-[#162032] shrink-0 space-y-2 bg-[#090F1B]">
          {/* Admin User Badge */}
          <div className={`flex items-center gap-2.5 p-2 rounded-xl bg-[#111C30]/80 border border-[#162032] ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 text-xs font-bold font-mono">
              {currentUser?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white truncate">
                    {currentUser?.displayName || 'Abishek V H'}
                  </span>
                  <span className="text-[9px] font-semibold px-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                    Owner
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate font-mono">
                  {currentUser?.email}
                </p>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className={`flex items-center gap-1.5 ${sidebarCollapsed ? 'flex-col' : 'justify-between'}`}>
            {/* Return to App Button */}
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-[#162032] transition-colors ${
                sidebarCollapsed ? 'w-full justify-center px-0' : 'flex-1'
              }`}
              title="Return to main Arckiv application"
            >
              <ArrowSquareOut size={15} weight="bold" />
              {!sidebarCollapsed && <span>Return to App</span>}
            </Link>

            {/* Collapse Toggle */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#162032] transition-colors cursor-pointer"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <SidebarSimple size={16} weight="bold" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN WORKSPACE CONTAINER ───────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[252px]'
        }`}
      >
        {/* Top Header Workspace Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
            >
              <List size={20} weight="bold" />
            </button>

            {/* Breadcrumb & Title */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium truncate">
                <span>Arckiv</span>
                <CaretRight size={10} className="text-slate-400" />
                <span className="text-slate-600">Command Center</span>
                <CaretRight size={10} className="text-slate-400" />
                <span className="text-blue-600 font-semibold">{activeTabInfo.label}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">
                {activeTabInfo.label}
              </h1>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Engine Status Chip */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-xs" />
              <span className="font-semibold text-slate-700">ML Engine v2</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-slate-500 text-[11px]">Threshold: 0.45</span>
            </div>

            {/* Refresh Action */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all flex items-center gap-2 shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Refresh active telemetry and records"
            >
              <ArrowClockwise
                size={14}
                weight="bold"
                className={isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}
              />
              <span className="hidden md:inline">Refresh Telemetry</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 sm:p-8 max-w-[1600px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              {tab === 'overview' && <OverviewSection {...sectionProps} />}
              {tab === 'users' && <UsersSection {...sectionProps} />}
              {tab === 'documents' && (
                <DocumentsSection
                  {...sectionProps}
                  onJumpToInference={handleJumpToInference}
                />
              )}
              {tab === 'ml-intelligence' && (
                <MLIntelligenceSection
                  {...sectionProps}
                  initialInferenceId={activeInferenceId}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
