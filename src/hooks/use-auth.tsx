import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { FINANCE_API_URL, getFinanceToken, clearFinanceToken } from "@/lib/finance-remote";

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getFinanceToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${FINANCE_API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { id?: string; email?: string } | null) => {
        if (data?.id) {
          setUser({ id: data.id, email: data.email ?? "" });
        } else {
          clearFinanceToken();
        }
      })
      .catch(() => clearFinanceToken())
      .finally(() => setLoading(false));
  }, []);

  return (
    <Ctx.Provider
      value={{
        session: user ? { access_token: getFinanceToken() } : null,
        user,
        loading,
        signOut: async () => {
          clearFinanceToken();
          setUser(null);
          window.location.href = "/login";
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
