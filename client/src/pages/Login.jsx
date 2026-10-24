import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Hexagon, 
  ShieldCheck, 
  Sparkle, 
  MagnifyingGlass, 
  ClockCounterClockwise, 
  ShareNetwork,
  Spinner,
  ArrowRight,
  LockKey
} from '@phosphor-icons/react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SpatialBackground from '../components/ui/SpatialBackground';

export default function Login() {
  const navigate = useNavigate();
  const { loginWithGoogle, currentUser } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect to dashboard
  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(err?.code ? `${err.code}: ${err.message}` : (err?.message || 'Failed to authenticate with Google. Please try again.'));
      console.error(err);
      setIsLoggingIn(false);
    }
  };

  const capabilities = [
    { icon: Sparkle, title: 'Multimodal Gemini OCR', desc: 'Automatic key-field extraction & structured summaries' },
    { icon: MagnifyingGlass, title: 'Atlas Vector Search', desc: '3072-dimensional cosine similarity semantic recall' },
    { icon: ClockCounterClockwise, title: 'Transactional Audit Trail', desc: 'Immutable append-only provenance logging' },
    { icon: ShareNetwork, title: 'Time-Limited Secure Sharing', desc: 'Cryptographic token hashes & dynamic QR codes' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-hidden">
      {/* Dynamic Ambient Background */}
      <SpatialBackground density={30} particleSize={1.4} />
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        
        {/* Left Column: Brand Hero & Intelligence Showcase */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 space-y-8 text-center lg:text-left"
        >
          {/* Brand Emblem & Tag */}
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/25">
              <Hexagon weight="fill" className="text-white" size={28} />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight text-gray-950">Arckiv</span>
              <span className="ml-2 px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-mono font-bold rounded-full uppercase tracking-wider">
                Document OS
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-950 tracking-tight leading-[1.15]">
              Intelligent Document <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Intelligence Platform
              </span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 font-medium max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Unified workspace engineered for multimodal AI extraction, vector semantic retrieval, provenance audit tracking, and cryptographic sharing.
            </p>
          </div>

          {/* Capability Pills Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {capabilities.map((cap, idx) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.08 + 0.2 }}
                className="glass-card p-4 rounded-2xl border border-gray-200/80 bg-white/70 backdrop-blur-sm text-left flex items-start gap-3"
              >
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0 mt-0.5">
                  <cap.icon size={18} weight="bold" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-gray-900 truncate">{cap.title}</h4>
                  <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{cap.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right Column: Authentication Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5"
        >
          <div className="glass-card p-8 sm:p-10 rounded-3xl bg-white/90 backdrop-blur-xl border border-gray-200 shadow-2xl space-y-6">
            
            <div className="space-y-1.5 text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100">
                <LockKey size={24} weight="bold" />
              </div>
              <h2 className="text-xl font-bold text-gray-950 tracking-tight">Sign In to Arckiv</h2>
              <p className="text-xs text-gray-500 font-medium">Authenticate via secure institutional Google SSO</p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl text-center font-semibold"
              >
                {error}
              </motion.div>
            )}

            {/* Google Authentication Button */}
            <div className="space-y-3 pt-2">
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black text-white rounded-2xl text-sm font-bold shadow-xl shadow-gray-900/15 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <Spinner size={20} className="animate-spin text-white" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>{isLoggingIn ? 'Authenticating Session...' : 'Continue with Google'}</span>
              </button>
            </div>

            {/* Security Footer Note */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-[11px] text-gray-400 font-medium">
              <ShieldCheck size={14} className="text-emerald-500 shrink-0" weight="fill" />
              <span>Protected by Firebase Auth & SHA-256 tokens</span>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
