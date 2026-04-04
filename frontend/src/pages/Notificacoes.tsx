import { useState } from 'react';
import { useNotificacoes, Notificacao } from '@/hooks/useNotificacoes';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Notificacoes() {
  const { 
    notificacoes, 
    marcarLida, 
    marcarTodasLidas, 
    limparTodas, 
    removerNotificacao,
    naoLidas 
  } = useNotificacoes();
  const { userData } = useAuth();
  const [periodo, setPeriodo] = useState('todas');
  const [tipoFiltro, setTipoFiltro] = useState('todas');
  const navigate = useNavigate();

  const notificacoesFiltradas = notificacoes.filter(notif => {
    // Filtro por tipo
    if (tipoFiltro !== 'todas' && notif.tipo !== tipoFiltro) return false;
    
    // Filtro por período
    if (periodo === 'todas') return true;
    
    const agora = new Date();
    const dataNotif = notif.data ? new Date(notif.data) : new Date();
    
    if (periodo === 'hoje') {
      return dataNotif.toDateString() === agora.toDateString();
    }
    if (periodo === 'semana') {
      const seteDias = new Date(agora);
      seteDias.setDate(agora.getDate() - 7);
      return dataNotif >= seteDias;
    }
    if (periodo === 'mes') {
      return dataNotif.getMonth() === agora.getMonth() &&
             dataNotif.getFullYear() === agora.getFullYear();
    }
    return true;
  });

  // Agrupar notificações por data
  const notificacoesAgrupadas = notificacoesFiltradas.reduce((grupos, notif) => {
    const dataObj = notif.data ? new Date(notif.data) : new Date();
    const hoje = new Date();
    
    let dataLabel = dataObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    if (dataObj.toDateString() === hoje.toDateString()) {
      dataLabel = 'Hoje';
    } else {
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      if (dataObj.toDateString() === ontem.toDateString()) {
        dataLabel = 'Ontem';
      }
    }
    
    if (!grupos[dataLabel]) grupos[dataLabel] = [];
    grupos[dataLabel].push(notif);
    return grupos;
  }, {} as Record<string, Notificacao[]>);

  const handleClickNotificacao = (notif: Notificacao) => {
    marcarLida(notif.id);
    if (notif.consulta_id) {
      navigate(`/prontuario/${notif.consulta_id}`);
    } else if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Você tem {naoLidas} notificações não lidas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={marcarTodasLidas}>
            Marcar todas como lidas
          </Button>
          <Button variant="outline" size="sm" onClick={limparTodas} className="text-destructive hover:bg-destructive/10">
            Limpar todas
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Filtros de período */}
        <div className="flex flex-wrap gap-2 p-1 bg-muted/30 rounded-lg w-fit">
          <Button 
            variant={periodo === 'hoje' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPeriodo('hoje')}
            className={periodo === 'hoje' ? 'bg-background shadow-sm' : ''}
          >
            Hoje
          </Button>
          <Button 
            variant={periodo === 'semana' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPeriodo('semana')}
            className={periodo === 'semana' ? 'bg-background shadow-sm' : ''}
          >
            Esta Semana
          </Button>
          <Button 
            variant={periodo === 'mes' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPeriodo('mes')}
            className={periodo === 'mes' ? 'bg-background shadow-sm' : ''}
          >
            Este Mês
          </Button>
          <Button 
            variant={periodo === 'todas' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPeriodo('todas')}
            className={periodo === 'todas' ? 'bg-background shadow-sm' : ''}
          >
            Todas
          </Button>
        </div>

        {/* Filtros por tipo */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">Filtrar por:</span>
          {[
            { id: 'todas', label: 'Todas', icon: '🔔' },
            { id: 'consulta', label: 'Consultas', icon: '📅' },
            { id: 'financeiro', label: 'Financeiro', icon: '💰' },
            { id: 'estoque', label: 'Estoque', icon: '📦' },
            { id: 'caixa', label: 'Caixa', icon: '🏦' }
          ].filter(tipo => {
            if (userData?.cargo === 'veterinario') {
              return tipo.id === 'todas' || tipo.id === 'consulta';
            }
            return true;
          }).map(tipo => (
            <Badge
              key={tipo.id}
              variant={tipoFiltro === tipo.id ? 'default' : 'outline'}
              className={`cursor-pointer px-3 py-1 text-xs font-medium transition-all ${tipoFiltro === tipo.id ? 'shadow-md scale-105' : 'hover:bg-muted'}`}
              onClick={() => setTipoFiltro(tipo.id)}
            >
              {tipo.icon} {tipo.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(notificacoesAgrupadas).length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-semibold text-foreground">Nenhuma notificação</p>
            <p className="text-muted-foreground text-sm mt-1 max-w-[250px]">
              Você está em dia com tudo! 🎉
            </p>
          </div>
        ) : (
          Object.entries(notificacoesAgrupadas).map(([data, notifs]) => (
            <div key={data} className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-muted-foreground whitespace-nowrap bg-muted/50 px-3 py-1 rounded-full">{data}</span>
                <div className="flex-1 h-[1px] bg-border" />
              </div>
              
              <div className="grid gap-3">
                {notifs.map(notif => (
                  <div
                    key={notif.id}
                    className={`group p-4 rounded-xl border-l-4 transition-all duration-200
                      hover:shadow-lg hover:translate-x-1
                      ${!notif.lida 
                        ? 'bg-primary/5 border-primary border-r border-t border-b' 
                        : 'bg-card border-muted-foreground/30 border-r border-t border-b'}`}
                    onClick={() => handleClickNotificacao(notif)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-background shadow-sm group-hover:scale-110 transition-transform`}>
                        {notif.icone}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-bold text-foreground text-base truncate">{notif.titulo}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!notif.lida && (
                              <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removerNotificacao(notif.id);
                              }}
                              className="text-muted-foreground/30 hover:text-destructive transition-colors p-1 rounded-full hover:bg-destructive/10 opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground/90 mt-1 line-clamp-2 leading-relaxed">{notif.mensagem}</p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase tracking-tighter">{notif.tempo}</span>
                            <span className="text-[11px] font-medium text-muted-foreground/60 italic">{new Date(notif.data).toLocaleDateString()}</span>
                          </div>
                          {(notif.link || notif.consulta_id) && (
                            <span className="text-xs text-primary font-bold flex items-center gap-1 group-hover:underline">
                              Ver detalhes 
                              <span className="text-sm">→</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
