import { apiUrl } from '../lib/api';
import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState('');

  // Sync Firebase user with our MongoDB Backend
  const syncWithBackend = async (firebaseUser) => {
    setSyncError('');
    try {
      const token = await firebaseUser.getIdToken();
      
      const response = await fetch(apiUrl('/api/auth/sync'), {
        method: 'POST',
        signal: AbortSignal.timeout(120000),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to sync with backend');
      
      const data = await response.json();
      setDbUser(data.user);
    } catch (error) {
      setSyncError('Cannot connect to Arckiv. The free server may be waking up. Please retry in a moment.');
      console.error("Backend Sync Error:", error);
    }
  };

  const loginWithGoogle = async () => {
    try {
      // Persistence is configured at initialization so this opens in the click gesture.
      const result = await signInWithPopup(auth, googleProvider);
      await syncWithBackend(result.user);
      return result;
    } catch (error) {
      console.error("Google Login Error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setDbUser(null);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await syncWithBackend(user);
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    dbUser, // Contains MongoDB _id and custom fields
    loginWithGoogle,
    logout,
    loading,
    syncError,
    retrySync: () => currentUser && syncWithBackend(currentUser)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
