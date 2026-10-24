import { apiUrl } from '../../lib/api';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PaperPlaneRight, Sparkle, User, FileText } from '@phosphor-icons/react';

export default function DocumentChatModal({ isOpen, onClose, document, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Reset chat when opened with a new document
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInputValue('');
    }
  }, [isOpen, document]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!isOpen || !document) return null;

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message to UI
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const token = await currentUser.getIdToken();
      
      const response = await fetch(apiUrl(`/api/documents/${document._id}/chat`), {
        method: 'POST',
        signal: AbortSignal.timeout(120000),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-20).map(m => ({ role: m.role, content: m.content.slice(0, 2000) }))
        })
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new Error(failure.error || 'Chat is unavailable. Please try again.');
      }

      const data = await response.json();
      
      // Add AI response to UI
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: error.name === 'TimeoutError'
        ? 'The server took too long to respond. It may be waking up; please try again.'
        : error.message || 'Chat is unavailable. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl rounded-3xl flex flex-col overflow-hidden h-[80vh] max-h-[800px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-hover)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-xl text-[var(--color-primary)]">
                <Sparkle size={24} weight="duotone" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-[var(--foreground)] leading-tight">Chat with Document</h2>
                <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] mt-0.5">
                  <FileText size={14} />
                  <span className="truncate max-w-[250px] sm:max-w-[300px]">{document.name}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-70">
                <Sparkle size={48} weight="duotone" className="text-[var(--color-primary)] opacity-50" />
                <div>
                  <p className="text-[var(--foreground)] font-medium text-lg">Ask anything about this document</p>
                  <p className="text-[var(--muted)] text-sm max-w-xs mt-2">I'll read through the contents and answer your questions directly from the text.</p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                  }`}>
                    {msg.role === 'user' ? <User size={16} weight="bold" /> : <Sparkle size={16} weight="fill" />}
                  </div>
                  
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] rounded-tl-sm whitespace-pre-wrap'
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))
            )}
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 flex-row"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                  <Sparkle size={16} weight="fill" className="animate-pulse" />
                </div>
                <div className="bg-[var(--surface-hover)] border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)]">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a question..."
                className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-full py-3.5 pl-5 pr-14 text-sm sm:text-base text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 p-2.5 bg-[var(--color-primary)] text-white rounded-full hover:bg-[var(--color-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <PaperPlaneRight size={18} weight="fill" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
