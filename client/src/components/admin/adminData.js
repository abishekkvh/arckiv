import { useEffect, useState } from 'react';
import { apiUrl } from '../../lib/api';

/**
 * Custom hook to fetch admin data with auto-abort and token auth.
 */
export function useAdminData(path, user, revision = 0) {
  const [state, setState] = useState({ data: null, error: '', loading: true });

  useEffect(() => {
    if (!path || !user) return;
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: '' }));

    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(apiUrl(path), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Unable to load data (${res.status})`);
        if (!controller.signal.aborted) setState({ data, error: '', loading: false });
      } catch (e) {
        if (!controller.signal.aborted) setState({ data: null, error: e.message, loading: false });
      }
    })();

    return () => controller.abort();
  }, [path, user, revision]);

  return state;
}

/**
 * Generic admin API fetcher for mutations (PATCH, POST, DELETE).
 */
export async function adminApiRequest(path, user, options = {}) {
  if (!user) throw new Error('Authentication required');
  const token = await user.getIdToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(apiUrl(path), {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const pct = (n) => (typeof n === 'number' && Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : 'Unavailable');
export const time = (n) => (typeof n === 'number' && Number.isFinite(n) ? `${n.toFixed(0)} ms` : 'Unavailable');
export const date = (n) => (n ? new Date(n).toLocaleString() : 'Not recorded');
export const shortDate = (n) =>
  n
    ? new Date(n).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

export const bytes = (n) => {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
};

export const formatNumber = (n) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
  return new Intl.NumberFormat().format(n);
};
