import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  icone: string;
  lida: boolean;
  tempo: string;
  data: string;
  tipo: 'consulta' | 'financeiro' | 'estoque' | 'caixa';
  link?: string;
  consulta_id?: string;
}

interface NotificacoesContextType {
  notificacoes: Notificacao[];
  adicionarNotificacao: (notif: Omit<Notificacao, 'id' | 'lida' | 'tempo' | 'data'>) => void;
  marcarLida: (id: string) => void;
  removerNotificacao: (id: string) => void;
  marcarTodasLidas: () => void;
  limparTodas: () => void;
  naoLidas: number;
}

const NotificacoesContext = createContext<NotificacoesContextType | undefined>(undefined);

export function NotificacoesProvider({ children }: { children: React.ReactNode }) {
  const { userData } = useAuth();
  const storageKey = userData?.id ? `petflow_notif_${userData.id}` : null;
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const hasLoaded = useRef(false);

  // 1. Carregar do localStorage
  useEffect(() => {
    if (!storageKey) {
      setNotificacoes([]);
      hasLoaded.current = false;
      return;
    }
    
    try {
      const salvas = localStorage.getItem(storageKey);
      if (salvas) {
        setNotificacoes(JSON.parse(salvas));
      } else {
        setNotificacoes([]);
      }
    } catch (e) {
      console.error('Erro ao carregar notificações:', e);
      setNotificacoes([]);
    } finally {
      hasLoaded.current = true;
    }
  }, [storageKey]);

  // 2. Salvar no localStorage
  useEffect(() => {
    if (!storageKey || !hasLoaded.current) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(notificacoes));
    } catch (e) {
      console.error('Erro ao salvar notificações:', e);
    }
  }, [notificacoes, storageKey]);

  // 3. Sincronização entre abas
  useEffect(() => {
    if (!storageKey) return;
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          setNotificacoes(JSON.parse(e.newValue));
        } catch {}
      }
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [storageKey]);

  const adicionarNotificacao = useCallback((notif: Omit<Notificacao, 'id' | 'lida' | 'tempo' | 'data'>) => {
    const nova: Notificacao = {
      ...notif,
      id: crypto.randomUUID(),
      lida: false,
      data: new Date().toISOString(),
      tempo: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      })
    };
    setNotificacoes(prev => [nova, ...prev].slice(0, 50));
  }, []);

  const marcarLida = useCallback((id: string) => {
    setNotificacoes(prev =>
      prev.map(n => n.id === id ? { ...n, lida: true } : n)
    );
  }, []);

  const removerNotificacao = useCallback((id: string) => {
    setNotificacoes(prev => prev.filter(n => n.id !== id));
  }, []);

  const marcarTodasLidas = useCallback(() => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  }, []);

  const limparTodas = useCallback(() => {
    setNotificacoes([]);
    if (storageKey) localStorage.removeItem(storageKey);
  }, [storageKey]);

  const value = {
    notificacoes,
    adicionarNotificacao,
    marcarLida,
    removerNotificacao,
    marcarTodasLidas,
    limparTodas,
    naoLidas: notificacoes.filter(n => !n.lida).length
  };

  return (
    <NotificacoesContext.Provider value={value}>
      {children}
    </NotificacoesContext.Provider>
  );
}

export function useNotificacoesContext() {
  const context = useContext(NotificacoesContext);
  if (context === undefined) {
    throw new Error('useNotificacoesContext deve ser usado dentro de um NotificacoesProvider');
  }
  return context;
}
