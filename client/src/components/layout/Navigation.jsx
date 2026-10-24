import { apiUrl, openDocument } from '../../lib/api';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  UploadSimple, 
  UserCircle, 
  List, 
  X, 
  Hexagon, 
  SquaresFour, 
  Folder, 
  MagnifyingGlass, 
  FileText, 
  FilePdf, 
  SpinnerGap, 
  ArrowRight,
  Sparkle
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ProfileModal from '../ui/ProfileModal';

export default function Navigation() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Global shortcut (⌘K or /) to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search debounce and fetch logic
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }

    setShowDropdown(true);
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const token = await currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch(apiUrl(`/api/documents/search?q=${encodeURIComponent(query)}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, currentUser]);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 60 && currentScrollY > lastScrollY) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY || currentScrollY <= 60) {
        setIsVisible(true);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowDropdown(false);
    navigate(`/my-files?q=${encodeURIComponent(query)}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'My Files', path: '/my-files' },
    { name: 'Upload', path: '/upload' },
  ];

  return (
    <>
      <nav
        className={clsx(
          "fixed w-full top-3 z-50 transition-all duration-300 px-4 sm:px-6 lg:px-8 pointer-events-none",
          isVisible ? "translate-y-0 opacity-100" : "-translate-y-24 opacity-0"
        )}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center h-16 pointer-events-auto">

          {/* Brand Logo (Left) */}
          <NavLink to="/dashboard" className="flex-shrink-0 flex items-center space-x-2.5 hover:opacity-90 transition-opacity">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl shadow-md shadow-blue-500/20">
              <Hexagon weight="fill" className="text-white" size={20} />
            </div>
            <span className="text-lg font-bold text-gray-950 tracking-tight">
              Arckiv
            </span>
          </NavLink>

          {/* Center Pill Navigation & Search Dock */}
          <div className="hidden md:flex items-center glass-pill p-1.5 rounded-2xl gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <NavLink
                  key={link.name}
                  to={link.path}
                  className={clsx(
                    "relative px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 z-10",
                    isActive ? "text-white" : "text-gray-600 hover:text-gray-950 hover:bg-gray-100/60"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 bg-blue-600 rounded-xl shadow-md shadow-blue-600/25 -z-10"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span>{link.name}</span>
                </NavLink>
              );
            })}

            <div className="h-5 w-px bg-gray-200 mx-1.5"></div>

            {/* Semantic Search Input */}
            <div className="relative">
              <form onSubmit={handleSearch} className="relative flex items-center">
                <MagnifyingGlass className="absolute left-3 text-gray-400" size={16} weight="bold" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Semantic search (e.g. 'college invoices')..."
                  className="w-64 lg:w-80 pl-8 pr-16 py-1.5 bg-gray-100/70 hover:bg-gray-100 focus:bg-white text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:w-96 transition-all duration-300 rounded-xl border border-transparent focus:border-blue-200"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => { if (query.trim()) setShowDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                />
                <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none">
                  {isSearching ? (
                    <SpinnerGap size={14} className="animate-spin text-blue-600" />
                  ) : (
                    <kbd className="bg-gray-200/80 text-gray-500 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold shadow-xs">⌘K</kbd>
                  )}
                </div>
              </form>

              {/* Semantic Search Live Results Dropdown */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full mt-2 w-full min-w-[360px] bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    {searchResults.length > 0 ? (
                      <div className="max-h-[55vh] overflow-y-auto">
                        <div className="p-2.5 px-3 bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkle size={12} weight="fill" className="text-blue-500" />
                          <span>Vector Search Matches</span>
                        </div>
                        {searchResults.slice(0, 5).map((doc) => (
                          <button 
                            key={doc._id}
                            onClick={() => {
                              setQuery('');
                              setShowDropdown(false);
                              openDocument(doc, currentUser);
                            }}
                            className="w-full text-left p-3 hover:bg-blue-50/70 flex items-start space-x-3 transition-colors border-b border-gray-100 last:border-0"
                          >
                            <div className="shrink-0 p-2 bg-white rounded-xl border border-gray-100 shadow-xs mt-0.5">
                              {doc.type?.includes('pdf') ? (
                                <FilePdf size={18} className="text-red-500" weight="duotone" />
                              ) : (
                                <FileText size={18} className="text-blue-600" weight="duotone" />
                              )}
                            </div>
                            <div className="overflow-hidden flex-1">
                              <h4 className="text-xs font-bold text-gray-900 truncate">{doc.name}</h4>
                              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                {doc.extractedData?.summary || (doc.tags?.length > 0 ? doc.tags.join(', ') : doc.category)}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                {doc.category && (
                                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                                    {doc.category}
                                  </span>
                                )}
                                {doc.size && (
                                  <span className="text-[9px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">
                                    {(doc.size / 1024 / 1024).toFixed(1)} MB
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                        <div 
                          onClick={handleSearch}
                          className="p-2.5 bg-gray-50 hover:bg-gray-100 border-t border-gray-200 text-center text-xs font-bold text-blue-600 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>Explore all results for "{query}"</span>
                          <ArrowRight size={14} weight="bold" />
                        </div>
                      </div>
                    ) : !isSearching && query.trim().length > 0 ? (
                      <div className="p-6 text-center text-gray-500 space-y-1">
                        <MagnifyingGlass size={28} weight="duotone" className="mx-auto text-gray-300 mb-1" />
                        <p className="text-xs font-bold text-gray-700">No matching concepts found</p>
                        <p className="text-[11px] text-gray-400">Try searching for broader keywords or categories</p>
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Actions: User Profile */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white border border-gray-200/80 hover:border-blue-300 overflow-hidden shadow-xs hover:shadow-md transition-all active:scale-95"
              title="User Account"
            >
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle weight="fill" size={26} className="text-gray-400" />
              )}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden bg-white/90 backdrop-blur-md p-1 rounded-2xl shadow-xs border border-gray-200 pointer-events-auto">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-gray-700 hover:text-gray-950 hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="md:hidden absolute top-20 left-4 right-4 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden pointer-events-auto p-4 space-y-2"
            >
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    className={clsx(
                      "flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                      isActive ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-gray-700 hover:bg-gray-100"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>{link.name}</span>
                  </NavLink>
                );
              })}
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsProfileOpen(true);
                  }}
                  className="flex items-center space-x-3 px-4 py-3 w-full text-gray-700 hover:bg-gray-100 rounded-2xl font-bold text-sm transition-colors"
                >
                  <UserCircle weight="bold" size={20} />
                  <span>My Profile & Settings</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    </>
  );
}
