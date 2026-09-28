"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
export { PERSONAS, personaById, canAccess, safeNext, PERSONA_COOKIE, PERSONA_STORAGE_KEY } from "./personas";
export type { Persona, PersonaId } from "./personas";
import { personaById, PERSONA_COOKIE, PERSONA_STORAGE_KEY, type Persona, type PersonaId } from "./personas";

const COOKIE = PERSONA_COOKIE;
const KEY = PERSONA_STORAGE_KEY;

interface AuthCtx {
  user: Persona | null;
  ready: boolean;
  login: (id: PersonaId) => Persona | null;
  logout: () => void;
}
const Ctx = createContext<AuthCtx>({ user: null, ready: false, login: () => null, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Persona | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const readCookie = () => {
      const match = document.cookie.split("; ").find((part) => part.startsWith(`${COOKIE}=`));
      return match ? decodeURIComponent(match.slice(COOKIE.length + 1)) : null;
    };
    const apply = (id: string | null) => {
      const persona = personaById(id);
      try {
        if (persona) {
          window.localStorage.setItem(KEY, persona.id);
          document.cookie = `${COOKIE}=${persona.id}; path=/; max-age=2592000; samesite=lax`;
        } else {
          window.localStorage.removeItem(KEY);
          document.cookie = `${COOKIE}=; path=/; max-age=0`;
        }
      } catch {
        /* storage unavailable */
      }
      setUser(persona);
    };
    try {
      apply(window.localStorage.getItem(KEY) || readCookie());
    } catch {
      setUser(null);
    }
    setReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== KEY) return;
      apply(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = useCallback((id: PersonaId) => {
    const p = personaById(id);
    if (p) {
      try {
        window.localStorage.setItem(KEY, id);
        document.cookie = `${COOKIE}=${id}; path=/; max-age=2592000; samesite=lax`;
      } catch {
        /* ignore */
      }
      setUser(p);
    }
    return p;
  }, []);

  const logout = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
      document.cookie = `${COOKIE}=; path=/; max-age=0`;
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, ready, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
