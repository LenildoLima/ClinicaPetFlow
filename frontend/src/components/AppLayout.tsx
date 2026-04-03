import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PawPrint, LayoutDashboard, Heart, Calendar, LogOut, Users, Settings, Bell, DollarSign, FileText, Wallet, UserCircle, Package, Tag, Landmark, FileBarChart } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NavItem {
  title: string;
  url: string;
  icon: any;
  roles: string[];
}

interface NavGroup {
  label: string;
  roles: string[];
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'GERAL',
    roles: ['admin'],
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard, roles: ['admin'] },
    ],
  },
  {
    label: 'ATENDIMENTO',
    roles: ['admin', 'veterinario', 'recepcionista'],
    items: [
      { title: 'Agenda', url: '/agenda', icon: Calendar, roles: ['admin', 'recepcionista'] },
      { title: 'Minha Agenda', url: '/minha-agenda', icon: Calendar, roles: ['veterinario'] },
      { title: 'Tutores', url: '/tutores', icon: Users, roles: ['admin', 'recepcionista'] },
      { title: 'Pets', url: '/pets', icon: Heart, roles: ['admin', 'veterinario', 'recepcionista'] },
      { title: 'Prontuários', url: '/prontuarios', icon: FileText, roles: ['admin', 'veterinario'] },
    ],
  },
  {
    label: 'FINANCEIRO',
    roles: ['admin', 'recepcionista'],
    items: [
      { title: 'Financeiro', url: '/financeiro', icon: DollarSign, roles: ['admin', 'recepcionista'] },
      { title: 'Caixa', url: '/caixa', icon: Landmark, roles: ['admin', 'recepcionista'] },
      { title: 'Relatórios', url: '/relatorios', icon: FileBarChart, roles: ['admin'] },
    ],
  },
  {
    label: 'ESTOQUE',
    roles: ['admin', 'recepcionista'],
    items: [
      { title: 'Estoque', url: '/estoque', icon: Package, roles: ['admin', 'recepcionista'] },
      { title: 'Serviços', url: '/servicos', icon: Tag, roles: ['admin'] },
    ],
  },
  {
    label: 'SISTEMA',
    roles: ['admin', 'veterinario', 'recepcionista'],
    items: [
      { title: 'Configurações', url: '/configuracoes', icon: Settings, roles: ['admin', 'veterinario', 'recepcionista'] },
    ],
  },
];

const formatRole = (role: string) => {
  const roles: Record<string, string> = {
    admin: 'Administrador',
    veterinario: 'Veterinário',
    recepcionista: 'Recepcionista',
  };
  return roles[role] || role;
};

function AppSidebar() {
  const { signOut, userData } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Filtrar grupos e itens baseado no cargo do usuário
  const filteredGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => userData && item.roles.includes(userData.cargo)),
    }))
    .filter(group => group.items.length > 0);

  return (
    <Sidebar className="border-r-0">

      <SidebarContent className="flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 px-6 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-accent">
              <PawPrint className="h-5 w-5 text-sidebar-foreground" />
            </div>
            <span className="text-xl font-bold text-sidebar-foreground">PetFlow</span>
          </div>

          {filteredGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest px-4 mb-1">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === '/'}
                          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                          activeClassName="bg-sidebar-accent text-sidebar-foreground font-semibold"
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </div>

        <div className="px-4 pb-6 space-y-4">
          {userData && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent/50 border border-sidebar-accent">
              <Avatar className="h-8 w-8 border border-white/10">
                <AvatarImage src={userData.foto_url || undefined} />
                <AvatarFallback className="bg-white/10 text-white text-[10px] font-bold">
                  {userData.nome.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate leading-none mb-1">
                  {userData.nome}
                </p>
                <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">
                  {formatRole(userData.cargo)}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors group"
          >
            <LogOut className="h-5 w-5 group-hover:text-primary transition-colors" />
            <span>Sair</span>
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

function AtualizacaoBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW registrado:', r);
    },
    onRegisterError(error) {
      console.log('Erro no SW:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white rounded-xl shadow-lg p-4 flex items-center gap-4 max-w-sm w-full mx-4">
      <div className="flex items-center gap-3 flex-1">
        <span className="text-2xl">🐾</span>
        <div>
          <p className="font-semibold text-sm">Nova versão disponível!</p>
          <p className="text-xs text-green-100">Clique para atualizar o PetFlow</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-green-200 text-sm px-2"
        >
          Depois
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          className="bg-white text-green-600 text-sm font-semibold px-3 py-1 rounded-lg whitespace-nowrap"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  icone: string;
  lida: boolean;
  tempo: string;
  tipo: 'consulta' | 'financeiro' | 'estoque' | 'caixa';
  link?: string;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [mostrarBanner, setMostrarBanner] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);

  const adicionarNotificacao = (notif: Omit<Notificacao, 'id' | 'lida' | 'tempo'>) => {
    const nova: Notificacao = {
      ...notif,
      id: crypto.randomUUID(),
      lida: false,
      tempo: 'Agora'
    };
    setNotificacoes(prev => [nova, ...prev].slice(0, 20)); // máximo 20
    
    // Toast visual também
    toast({
      title: notif.titulo,
      description: notif.mensagem,
    });
  };

  const marcarLida = (id: string) => {
    setNotificacoes(prev => 
      prev.map(n => n.id === id ? { ...n, lida: true } : n)
    );
  };

  const marcarTodasLidas = () => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  };

  useEffect(() => {
    if (!userData) return;

    const canais: any[] = [];

    // ─── NOTIFICAÇÃO 1: Nova consulta agendada (para veterinário) ───
    if (userData.cargo === 'veterinario' || userData.cargo === 'admin') {
      const canalConsultas = supabase
        .channel('novas-consultas')
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'consultas',
            filter: userData.cargo === 'veterinario' 
              ? `veterinario_id=eq.${userData.id}` 
              : undefined
          },
          async (payload) => {
            const consulta = payload.new as any;
            
            // Buscar nome do pet e tutor
            const { data } = await supabase
              .from('consultas')
              .select('pets(nome), tutores(nome), data_hora')
              .eq('id', consulta.id)
              .single();

            adicionarNotificacao({
              titulo: '📅 Nova consulta agendada',
              mensagem: `${data?.pets?.nome} (${data?.tutores?.nome}) — ${
                new Date(consulta.data_hora).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  day: '2-digit', month: '2-digit',
                  hour: '2-digit', minute: '2-digit'
                })
              }`,
              icone: '📅',
              tipo: 'consulta'
            });
          }
        )
        .subscribe();
      canais.push(canalConsultas);
    }

    // ─── NOTIFICAÇÃO 2: Status da consulta mudou (para recepcionista) ───
    if (userData.cargo === 'recepcionista' || userData.cargo === 'admin') {
      const canalStatus = supabase
        .channel('status-consultas')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'consultas' },
          async (payload) => {
            const antiga = payload.old as any;
            const nova = payload.new as any;
            
            if (antiga.status === nova.status) return;

            const statusLabel: Record<string, string> = {
              confirmado: '✅ confirmada',
              cancelado: '❌ cancelada',
              concluido: '✔️ concluída',
              em_atendimento: '🏥 em atendimento',
              faltou: '⚠️ tutor faltou'
            };

            if (statusLabel[nova.status]) {
              const { data } = await supabase
                .from('consultas')
                .select('pets(nome)')
                .eq('id', nova.id)
                .single();

              adicionarNotificacao({
                titulo: '🔄 Consulta atualizada',
                mensagem: `Consulta de ${data?.pets?.nome} foi ${statusLabel[nova.status]}`,
                icone: '🔄',
                tipo: 'consulta'
              });
            }
          }
        )
        .subscribe();
      canais.push(canalStatus);
    }

    // ─── NOTIFICAÇÃO 3: Novo rascunho no financeiro (para recepcionista) ───
    if (userData.cargo === 'recepcionista' || userData.cargo === 'admin') {
      const canalFinanceiro = supabase
        .channel('novo-rascunho')
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'financeiro',
            filter: 'status=eq.rascunho'
          },
          async (payload) => {
            const fin = payload.new as any;
            
            const { data } = await supabase
              .from('financeiro')
              .select('tutores(nome), descricao, valor_final')
              .eq('id', fin.id)
              .single();

            adicionarNotificacao({
              titulo: '💰 Nova cobrança para revisar',
              mensagem: `${data?.descricao} — R$ ${data?.valor_final?.toFixed(2)} (${data?.tutores?.nome})`,
              icone: '💰',
              tipo: 'financeiro'
            });
          }
        )
        .subscribe();
      canais.push(canalFinanceiro);
    }

    // ─── NOTIFICAÇÃO 4: Estoque baixo ───
    if (userData.cargo === 'admin' || userData.cargo === 'recepcionista') {
      const canalEstoque = supabase
        .channel('estoque-baixo')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'estoque_produtos' },
          (payload) => {
            const produto = payload.new as any;
            const anterior = payload.old as any;
            
            // Notificar quando cruzar o limite mínimo
            if (
              produto.estoque_atual <= produto.estoque_minimo &&
              anterior.estoque_atual > anterior.estoque_minimo
            ) {
              adicionarNotificacao({
                titulo: '⚠️ Estoque baixo',
                mensagem: `${produto.nome} — apenas ${produto.estoque_atual} unidades restantes`,
                icone: '⚠️',
                tipo: 'estoque'
              });
            }

            // Notificar quando zerar
            if (produto.estoque_atual === 0 && anterior.estoque_atual > 0) {
              adicionarNotificacao({
                titulo: '🚨 Produto esgotado!',
                mensagem: `${produto.nome} está sem estoque`,
                icone: '🚨',
                tipo: 'estoque'
              });
            }
          }
        )
        .subscribe();
      canais.push(canalEstoque);
    }

    // ─── NOTIFICAÇÃO 5: Caixa esquecido aberto ───
    if (userData.cargo === 'admin') {
      // Verificar ao carregar se tem caixa aberto de dia anterior
      const verificarCaixaEsquecido = async () => {
        const hoje = new Date().toLocaleDateString('en-CA', {
          timeZone: 'America/Sao_Paulo'
        });
        
        const { data: caixaAberto } = await supabase
          .from('caixa')
          .select('data, status')
          .eq('status', 'aberto')
          .neq('data', hoje)
          .single();

        if (caixaAberto) {
          adicionarNotificacao({
            titulo: '🏦 Caixa esquecido aberto!',
            mensagem: `O caixa do dia ${new Date(caixaAberto.data).toLocaleDateString('pt-BR')} ainda está aberto. Acesse o Caixa para fechar.`,
            icone: '🏦',
            tipo: 'caixa'
          });
        }
      };
      verificarCaixaEsquecido();
    }

    // Limpar canais ao desmontar
    return () => {
      canais.forEach(canal => supabase.removeChannel(canal));
    };
  }, [userData]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setMostrarBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstalar = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setMostrarBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <>
    <AtualizacaoBanner />
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b px-4 bg-card">
            <SidebarTrigger />
            
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative p-2 hover:bg-muted rounded-full transition-colors">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  {notificacoes.filter(n => !n.lida).length > 0 && (
                    <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground 
                      text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-card">
                      {notificacoes.filter(n => !n.lida).length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                  <h3 className="font-semibold text-sm">Notificações</h3>
                  <button 
                    onClick={marcarTodasLidas}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Limpar todas
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notificacoes.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma notificação por aqui
                      </p>
                    </div>
                  ) : (
                    notificacoes.map(n => (
                      <div 
                        key={n.id}
                        className={`p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors relative
                          ${!n.lida ? 'bg-primary/5' : ''}`}
                        onClick={() => marcarLida(n.id)}
                      >
                        <div className="flex gap-3">
                          <span className="text-xl flex-shrink-0">{n.icone}</span>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-semibold leading-tight">{n.titulo}</p>
                            <p className="text-xs text-muted-foreground leading-normal">{n.mensagem}</p>
                            <p className="text-[10px] text-muted-foreground/60">{n.tempo}</p>
                          </div>
                          {!n.lida && (
                            <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>

      {/* Banner de instalação PWA */}
      {mostrarBanner && (
        <div className="fixed bottom-4 left-4 right-4 bg-green-600 text-white rounded-xl p-4 shadow-lg flex items-center justify-between z-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐾</span>
            <div>
              <p className="font-semibold text-sm">Instalar PetFlow</p>
              <p className="text-xs text-green-100">Acesse como app no seu celular</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMostrarBanner(false)}
              className="text-green-200 text-sm px-2"
            >
              Agora não
            </button>
            <button
              onClick={handleInstalar}
              className="bg-white text-green-600 text-sm font-semibold px-3 py-1 rounded-lg"
            >
              Instalar
            </button>
          </div>
        </div>
      )}
    </SidebarProvider>
    </>
  );
}
