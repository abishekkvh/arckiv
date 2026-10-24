import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, SignOut } from '@phosphor-icons/react';

export default function ProfileModal({ isOpen, onClose, currentUser, onLogout }) {
  const [name, setName] = useState(currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-white rounded-[24px] shadow-2xl p-8 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">My profile</h2>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} weight="bold" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Left Column: Avatar */}
            <div className="flex flex-col items-center space-y-4">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 font-bold text-4xl">
                    {(currentUser?.displayName || currentUser?.email || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                <ImageIcon size={18} />
                <span>Edit</span>
              </button>
            </div>

            {/* Right Column: Form */}
            <div className="flex-1 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input 
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-10 flex items-center justify-between pt-6 border-t border-gray-100">
            <button 
              onClick={onLogout}
              className="flex items-center space-x-2 px-5 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-semibold transition-colors"
            >
              <SignOut size={20} weight="bold" />
              <span>Logout</span>
            </button>

            <div className="flex space-x-3">
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-sm"
              >
                Close
              </button>
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
