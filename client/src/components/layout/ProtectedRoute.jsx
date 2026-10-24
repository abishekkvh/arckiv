import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkle } from '@phosphor-icons/react';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading, syncError, retrySync } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Sparkle size={40} weight="duotone" className="text-[var(--color-primary)] animate-spin-slow" />
          <p className="font-bold text-[var(--color-primary)]">Loading Arckiv...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (syncError) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p role="alert">{syncError}</p>
      <button onClick={retrySync} className="rounded-xl bg-blue-600 text-white px-5 py-3">Retry connection</button>
    </div>
  );
  return children;
}
