'use client';

import { useState, useEffect, useCallback } from 'react';
import { generateSessionId } from '@/lib/utils';
import type { SessionResponse } from '@/types';

const SESSION_KEY = 'gsi-session-id';
const MAX_CREATIONS_PER_DAY = 5;
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

interface SessionState {
  sessionId: string;
  creationsRemaining: number;
  cooldownSeconds: number;
  isReady: boolean;
}

export function useSession() {
  const [session, setSession] = useState<SessionState>({
    sessionId: '',
    creationsRemaining: MAX_CREATIONS_PER_DAY,
    cooldownSeconds: 0,
    isReady: false,
  });

  // Initialize or restore session
  useEffect(() => {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateSessionId();
      localStorage.setItem(SESSION_KEY, id);
    }
    setSession((prev) => ({ ...prev, sessionId: id!, isReady: true }));
  }, []);

  // Track creation and update limits
  const trackCreation = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': session.sessionId },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
      const data: { success: boolean; data: SessionResponse } = await res.json();
      if (data.success && data.data) {
        setSession((prev) => ({
          ...prev,
          creationsRemaining: data.data.creationsRemaining,
          cooldownSeconds: data.data.cooldownSeconds,
        }));
      }
    } catch {
      // Silently fail — session tracking is non-blocking
    }
  }, [session.sessionId]);

  const canCreate = session.creationsRemaining > 0 && session.cooldownSeconds === 0;

  return { ...session, canCreate, trackCreation };
}
