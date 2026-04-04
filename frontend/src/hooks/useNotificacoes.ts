import { useNotificacoesContext, Notificacao } from '@/contexts/NotificacoesContext';

export type { Notificacao };

export function useNotificacoes() {
  return useNotificacoesContext();
}
