import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import type { Profile, Session } from './types';

const SESSION_KEY = 'pairforge_session';

interface AuthValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: { email: string; username: string; password: string; displayName: string }) => Promise<void>;
  setRole: (role: string) => Promise<void>;
  rememberProfile: (profile: Profile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function readSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('pairforge_token');
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem('pairforge_token', session.token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession);

  const value = useMemo<AuthValue>(() => {
    function save(next: Session) {
      writeSession(next);
      setSession(next);
    }
    return {
      session,
      async login(email, password) {
        save(await api<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }));
      },
      async signup(input) {
        save(await api<Session>('/auth/register', { method: 'POST', body: JSON.stringify(input) }));
      },
      async setRole(role) {
        if (!session) return;
        const body = await api<{ profile: Profile }>('/profile/role', { method: 'PATCH', body: JSON.stringify({ role }) });
        save({ ...session, profile: body.profile });
      },
      rememberProfile(profile) {
        if (!session) return;
        save({ ...session, profile });
      },
      logout() {
        writeSession(null);
        setSession(null);
      },
    };
  }, [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is missing');
  return value;
}
