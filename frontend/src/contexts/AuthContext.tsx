import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userData: { 
    id?: string;
    nome: string; 
    email?: string;
    telefone?: string | null;
    whatsapp?: string | null;
    cargo: string; 
    crmv?: string | null;
    ativo?: boolean;
    foto_url: string | null; 
    criado_em?: string;
  } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AuthContextType['userData']>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Changed from .single() to avoid 406 if row missing
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('JSON object')) {
          console.warn('Usuário não encontrado na tabela usuarios');
          setUserData(null);
          return;
        }
        throw error;
      }
      setUserData(data);
    } catch (error: any) {
      console.error('Erro ao buscar dados do usuário:', error);
      // Se o erro for de autenticação, limpa a sessão para evitar loops
      if (error.status === 401 || error.status === 403 || error.status === 406) {
        setUserData(null);
        // Não forçar logout aqui para evitar loops se onAuthStateChange disparar novamente
      }
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setUserData(null);
      }
      
      // Se a sessão foi invalidada ou expirou, garantimos que limpamos o estado
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setLoading(false);
      }
      
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Erro ao carregar sessão inicial:', error);
        // Se o erro for de token inválido ou rate limit, limpamos TUDO
        if (
          error.message.includes('refresh_token_not_found') || 
          error.message.includes('Invalid Refresh Token') ||
          error.status === 429 ||
          error.status === 400
        ) {
          console.warn('Limpando sessão corrompida...');
          supabase.auth.signOut().then(() => {
            // Se o signOut falhar, tentamos limpar o localStorage manualmente
            const storageKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
            if (storageKey) localStorage.removeItem(storageKey);
            window.location.reload(); // Recarrega para limpar o estado do cliente
          });
        }
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, userData, loading, signIn, signUp, signOut, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
