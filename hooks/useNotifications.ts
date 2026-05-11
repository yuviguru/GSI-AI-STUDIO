'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { NotificationDoc } from '@/types/notification.types';

interface ApiNotification {
  id: string;
  type: NotificationDoc['type'];
  payload: NotificationDoc['payload'];
  readAt: string | null;
  createdAt: string;
}

function deserialize(n: ApiNotification): NotificationDoc {
  return {
    id: n.id,
    recipientUid: '',
    type: n.type,
    payload: n.payload,
    channels: ['in_app'],
    readAt: n.readAt ? new Date(n.readAt) : null,
    createdAt: new Date(n.createdAt),
  };
}

interface UseNotificationsOptions {
  /** Polling interval in ms; set to 0 to disable. Default 60s. */
  pollMs?: number;
  /** How many to fetch on each poll. Default 20. */
  limit?: number;
}

/**
 * Wraps GET /api/notifications with polling, mark-read, and mark-all-read.
 * Used by both the bell badge (NotificationBell) and the dedicated inbox page.
 */
export function useNotifications({ pollMs = 60_000, limit = 20 }: UseNotificationsOptions = {}) {
  const { isAuthenticated, getIdToken } = useAuth();
  const [items, setItems] = useState<NotificationDoc[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    if (inflight.current) return;
    inflight.current = true;
    try {
      const token = await getIdToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/notifications?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(`Failed to load (${res.status})`);
        return;
      }
      const json = await res.json();
      const raw = (json.data?.notifications ?? []) as ApiNotification[];
      setItems(raw.map(deserialize));
      setUnreadCount(json.data?.unreadCount ?? 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  }, [isAuthenticated, getIdToken, limit]);

  useEffect(() => {
    void load();
    if (!isAuthenticated || pollMs <= 0) return;
    const id = window.setInterval(load, pollMs);
    return () => window.clearInterval(id);
  }, [isAuthenticated, load, pollMs]);

  const markRead = useCallback(
    async (id: string) => {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    },
    [getIdToken],
  );

  const markAllRead = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    setUnreadCount(0);
  }, [getIdToken]);

  return {
    items,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    refresh: load,
  };
}
