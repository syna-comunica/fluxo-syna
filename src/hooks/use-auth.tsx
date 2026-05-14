import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasFinanceApi, FINANCE_API_URL, getFinanceToken, clearFinanceToken } from "@/lib/finance-remote";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthCtx {
  session: object | null;
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ session: null, user: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<object | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasFinanceApi()) {
      const token = getFinanceToken();
      if (token) {
        fetch(`${FINANCE_API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data: { id?: string; email?: string } | null) => {
            if (data?.id) {
              setSession({ access_token: token });
              setUser({ id: data.id, email: data.email ?? "" });
            }
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ? { id: s.user.id, email: s.user.email ?? "" } : null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email ?? "" } : null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        user,
        loading,
        signOut: async () => {
          if (hasFinanceApi()) {
            clearFinanceToken();
            setSession(null);
            setUser(null);
          } else {
            await supabase.auth.signOut();
          }
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
