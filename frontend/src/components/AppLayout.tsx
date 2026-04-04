import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  PawPrint, 
  LayoutDashboard, 
  Heart, 
  Calendar, 
  LogOut, 
  Users, 
  Settings, 
  Bell, 
  DollarSign, 
  FileText, 
  Landmark, 
  Package, 
  Tag, 
  FileBarChart,
  Menu,
  ChevronDown
} from 'lucide-react';
import { NavLink as RouterNavLink } from 'react-router-dom';
import { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X } from 'lucide-react';
import { useNotificacoes, Notificacao } from '@/hooks/useNotificacoes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';

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
      { title: 'Notificações', url: '/notificacoes', icon: Bell, roles: ['admin', 'veterinario', 'recepcionista'] },
      { title: 'Configurações', url: '/configuracoes', icon: Settings, roles: ['admin', 'veterinario', 'recepcionista'] },
    ],
  },
];

const formatRole = (role: string) => {
  const roles: Record<string, string> = {
    admin: 'Administrador',
    veterinario: 'Veterário', // Fixed spelling here just in case, but keeping previous behavior
    recepcionista: 'Recepcionista',
  };
  return roles[role] || role;
};

function TopNavbar() {
  const { signOut, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => userData && item.roles.includes(userData.cargo)),
    }))
    .filter(group => group.items.length > 0);

  const NavContent = ({ mobile = false }) => (
    <>
      {filteredGroups.map((group) => {
        // Se for MOBILE, exibe como lista estendida
        if (mobile) {
          return (
            <div key={group.label} className="py-2">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2">
                {group.label}
              </h4>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.url || (item.url !== '/' && location.pathname.startsWith(item.url));
                  return (
                    <RouterNavLink
                      key={item.title}
                      to={item.url}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive 
                          ? 'bg-primary/10 text-primary font-medium' 
                          : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </RouterNavLink>
                  );
                })}
              </div>
            </div>
          );
        }

        // Se for DESKTOP e tiver apenas 1 item (ex: Dashboard), renderiza limpo
        if (group.items.length === 1 && group.label === 'GERAL') {
          const item = group.items[0];
          const isActive = location.pathname === item.url;
          return (
            <RouterNavLink
              key={item.title}
              to={item.url}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-foreground/70 hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </RouterNavLink>
          );
        }

        // Se for DESKTOP e tiver múltiplos itens, usa DropdownMenu
        const isActiveGroup = group.items.some(item => location.pathname === item.url || (item.url !== '/' && location.pathname.startsWith(item.url)));
        
        return (
          <DropdownMenu key={group.label}>
            <DropdownMenuTrigger className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors outline-none cursor-pointer ${
              isActiveGroup 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'text-foreground/70 hover:bg-muted hover:text-foreground'
            }`}>
              {group.label}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {group.items.map((item) => (
                <DropdownMenuItem key={item.title} asChild>
                  <RouterNavLink
                    to={item.url}
                    className="flex items-center gap-2 w-full cursor-pointer"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground opacity-70" />
                    {item.title}
                  </RouterNavLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background shadow-sm">
      <div className="flex h-14 items-center px-4 md:px-6 gap-4">
        {/* Mobile Nav Trigger */}
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <div className="p-4 border-b flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <PawPrint className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">PetFlow</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                 <NavContent mobile={true} />
              </div>
              {userData && (
                 <div className="p-4 border-t bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-9 w-9 border">
                        <AvatarImage src={userData.foto_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {userData.nome.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-foreground truncate leading-none mb-1">
                          {userData.nome}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                          {formatRole(userData.cargo)}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleSignOut}>
                       <LogOut className="h-4 w-4" /> Sair do Sistema
                    </Button>
                 </div>
              )}
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo (Desktop) */}
        <RouterNavLink to="/" className="hidden md:flex items-center gap-2 mr-6 hover:opacity-90 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <PawPrint className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">PetFlow</span>
        </RouterNavLink>

        {/* Main Nav (Desktop) */}
        <nav className="hidden md:flex items-center space-x-1 flex-1">
          <NavContent />
        </nav>
        
        {/* Right Nav (Notificações, etc ficarão fora dessa navbar específica) */}
        <div className="flex flex-1 md:flex-none justify-end items-center gap-2">
           {/* placeholder para as notificações do AppLayout renderizar ao lado */}
           <div id="navbar-actions-portal" className="flex items-center gap-2 w-full justify-end md:w-auto"></div>
           
           {/* Perfil (Desktop) */}
           {userData && (
             <DropdownMenu>
               <DropdownMenuTrigger className="hidden md:flex items-center outline-none">
                 <Avatar className="h-8 w-8 border hover:opacity-80 transition-opacity cursor-pointer">
                    <AvatarImage src={userData.foto_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                      {userData.nome.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                 </Avatar>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-56">
                 <div className="flex items-center justify-start gap-2 p-2">
                   <div className="flex flex-col space-y-1 leading-none">
                     <p className="font-medium text-sm truncate">{userData.nome}</p>
                     <p className="text-[10px] text-muted-foreground uppercase font-semibold truncate">{formatRole(userData.cargo)}</p>
                   </div>
                 </div>
                 <div className="border-t my-1"></div>
                 <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="cursor-pointer">
                   <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                   <span>Configurações</span>
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 cursor-pointer">
                   <LogOut className="mr-2 h-4 w-4" />
                   <span>Sair da conta</span>
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
           )}
        </div>
      </div>
    </header>
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

export default function AppLayout({ children }: { children: ReactNode }) {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [mostrarBanner, setMostrarBanner] = useState(false);
  const { 
    notificacoes, 
    adicionarNotificacao: adicionarNoHook,
    marcarLida, 
    marcarTodasLidas, 
    limparTodas, 
    removerNotificacao,
    naoLidas 
  } = useNotificacoes();

  const adicionarNotificacao = (notif: Omit<Notificacao, 'id' | 'lida' | 'tempo' | 'data'>) => {
    adicionarNoHook(notif);
    
    toast({
      title: notif.titulo,
      description: notif.mensagem,
    });
  };

  const [popoverAberto, setPopoverAberto] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData?.id || !userData?.cargo) return;

    const canais: any[] = [];
    const meuId = userData.id;
    const meuCargo = userData.cargo.toLowerCase();

    // ─── CANAL 1: Consultas ───
    if (meuCargo === 'veterinario' || meuCargo === 'admin' || meuCargo === 'recepcionista') {
      const canalConsultas = supabase
        .channel(`novas-consultas-${meuId}`)
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'consultas',
            ...(meuCargo === 'veterinario' ? { filter: `veterinario_id=eq.${meuId}` } : {})
          },
          async (payload) => {
            const consulta = payload.new as any;
            if (consulta.criado_por === meuId) return;

            const { data: infoExtra } = await supabase
              .from('consultas')
              .select('pets(nome), tutores(nome), usuarios:criado_por(cargo)')
              .eq('id', consulta.id)
              .maybeSingle();
            
            const cargoCriador = (infoExtra as any)?.usuarios?.cargo?.toLowerCase() || '';

            if (meuCargo === 'veterinario' && cargoCriador !== 'recepcionista' && cargoCriador !== 'admin') return;
            if (meuCargo === 'recepcionista' && cargoCriador === 'recepcionista') return;

            adicionarNotificacao({
              titulo: '📅 Nova consulta agendada',
              mensagem: `${(infoExtra as any)?.pets?.nome || 'Novo Paciente'} (${(infoExtra as any)?.tutores?.nome || 'Tutor'}) — ${
                new Date(consulta.data_hora).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  day: '2-digit', month: '2-digit',
                  hour: '2-digit', minute: '2-digit'
                })
              }`,
              icone: '📅',
              tipo: 'consulta',
              link: meuCargo === 'admin' ? '/agenda' : '/minha-agenda',
              consulta_id: consulta.id
            });
          }
        )
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'consultas',
            ...(meuCargo === 'veterinario' ? { filter: `veterinario_id=eq.${meuId}` } : {})
          },
          async (payload) => {
            const antiga = payload.old as any;
            const nova = payload.new as any;
            if (antiga.status === nova.status) return;

            const { data: infoExtra } = await supabase
              .from('consultas')
              .select('pets(nome), tutores(nome), criado_por, usuarios:criado_por(cargo)')
              .eq('id', nova.id)
              .maybeSingle();
            
            if (infoExtra?.criado_por === meuId) return;

            const cargoCriador = (infoExtra as any)?.usuarios?.cargo?.toLowerCase() || '';

            if (meuCargo === 'veterinario' && cargoCriador !== 'recepcionista' && cargoCriador !== 'admin') return;
            if (meuCargo === 'recepcionista' && cargoCriador === 'recepcionista') return;

            const statusLabel: Record<string, string> = {
              confirmado: '✅ confirmada',
              cancelado: '❌ cancelada',
              concluido: '✔️ concluída',
              em_atendimento: '🏥 em atendimento',
              faltou: '⚠️ tutor faltou'
            };

            if (statusLabel[nova.status]) {
              adicionarNotificacao({
                titulo: '🔄 Consulta atualizada',
                mensagem: `Consulta de ${(infoExtra as any)?.pets?.nome || 'atendimento'} (${(infoExtra as any)?.tutores?.nome || 'Tutor'}) foi ${statusLabel[nova.status]}`,
                icone: '🔄',
                tipo: 'consulta',
                link: meuCargo === 'admin' ? '/agenda' : '/minha-agenda'
              });
            }
          }
        )
        .subscribe();
      canais.push(canalConsultas);
    }

    // ─── CANAL 2: Financeiro ───
    if (meuCargo === 'recepcionista' || meuCargo === 'admin') {
      const canalFinanceiro = supabase
        .channel('financeiro-eventos')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'financeiro' },
          async (payload) => {
            const fin = payload.new as any;
            if (fin.criado_por === meuId) return;

            const { data } = await supabase
              .from('financeiro')
              .select('tutores(nome), descricao, valor_final, status')
              .eq('id', fin.id)
              .maybeSingle();

            if (data) {
              const titulos: Record<string, string> = {
                rascunho: '💰 Novo rascunho para revisar',
                pendente: '💳 Nova cobrança pendente',
                pago: '✅ Pagamento recebido'
              };

              if (titulos[data.status]) {
                adicionarNotificacao({
                  titulo: titulos[data.status],
                  mensagem: `${data?.descricao} — R$ ${data?.valor_final?.toFixed(2)} (${(data?.tutores as any)?.nome})`,
                  icone: data.status === 'pago' ? '✅' : '💰',
                  tipo: 'financeiro',
                  link: '/financeiro'
                });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'financeiro' },
          async (payload) => {
            const nova = payload.new as any;
            const antiga = payload.old as any;
            if (nova.status === antiga.status) return;
            // Se mudou para pago
            if (nova.status === 'pago') {
               const { data } = await supabase
                .from('financeiro')
                .select('tutores(nome), descricao, valor_final')
                .eq('id', nova.id)
                .maybeSingle();

              if (data) {
                adicionarNotificacao({
                  titulo: '✅ Pagamento finalizado',
                  mensagem: `${data?.descricao} — R$ ${data?.valor_final?.toFixed(2)} (${(data?.tutores as any)?.nome})`,
                  icone: '✅',
                  tipo: 'financeiro',
                  link: '/financeiro'
                });
              }
            }
          }
        )
        .subscribe();
      canais.push(canalFinanceiro);
    }

    // ─── CANAL 3: Estoque ───
    if (meuCargo === 'admin' || meuCargo === 'recepcionista') {
      const canalEstoque = supabase
        .channel('estoque-eventos')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'estoque_produtos' },
          (payload) => {
            const produto = payload.new as any;
            const anterior = payload.old as any;
            
            // Alerta de estoque baixo
            if (produto.estoque_atual <= produto.estoque_minimo && anterior.estoque_atual > anterior.estoque_minimo) {
              adicionarNotificacao({
                titulo: '⚠️ Estoque baixo',
                mensagem: `${produto.nome} — apenas ${produto.estoque_atual} unidades restantes`,
                icone: '⚠️',
                tipo: 'estoque',
                link: '/estoque'
              });
            } else if (produto.estoque_atual < anterior.estoque_atual) {
              // Notificar qualquer saída de estoque (venda)
              adicionarNotificacao({
                titulo: '📦 Saída de estoque',
                mensagem: `${produto.nome} — estoque atual: ${produto.estoque_atual}`,
                icone: '📦',
                tipo: 'estoque',
                link: '/estoque'
              });
            }
          }
        )
        .subscribe();
      canais.push(canalEstoque);
    }

    // ─── CANAL 4: Caixa ───
    if (meuCargo === 'admin') {
      const canalCaixa = supabase
        .channel('caixa-eventos')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'caixa_movimentacoes' },
          async (payload) => {
            const mov = payload.new as any;
            if (mov.registrado_por === meuId) return;

            adicionarNotificacao({
              titulo: mov.tipo === 'entrada' ? '🏦 Entrada no Caixa' : '🏦 Saída do Caixa',
              mensagem: `${mov.descricao} — R$ ${mov.valor.toFixed(2)}`,
              icone: '🏦',
              tipo: 'caixa',
              link: '/caixa'
            });
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'caixa' },
          (payload) => {
            const caixa = payload.new as any;
            const antiga = payload.old as any;
            if (caixa.status === 'fechado' && antiga.status === 'aberto') {
              adicionarNotificacao({
                titulo: '🔐 Caixa fechado',
                mensagem: `O caixa do dia ${new Date(caixa.data).toLocaleDateString('pt-BR')} foi finalizado.`,
                icone: '🔐',
                tipo: 'caixa',
                link: '/caixa'
              });
            }
          }
        )
        .subscribe();
      canais.push(canalCaixa);

      // Verificação de caixa esquecido (no mount)
      const verificarCaixaEsquecido = async () => {
        const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        try {
          const { data: caixaAberto } = await supabase
            .from('caixa')
            .select('data, status')
            .eq('status', 'aberto')
            .neq('data', hoje)
            .maybeSingle();

          if (caixaAberto) {
            adicionarNotificacao({
              titulo: '🏦 Caixa esquecido aberto!',
              mensagem: `O caixa do dia ${new Date(caixaAberto.data).toLocaleDateString('pt-BR')} ainda está aberto.`,
              icone: '🏦',
              tipo: 'caixa',
              link: '/caixa'
            });
          }
        } catch (err) {
          console.warn('Silent skip no alerta de caixa:', err);
        }
      };
      verificarCaixaEsquecido();
    }

    return () => {
      canais.forEach(canal => supabase.removeChannel(canal));
    };
  }, [userData?.id]);

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
      if (outcome === 'accepted') setMostrarBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleClickNotificacao = (notif: Notificacao) => {
    marcarLida(notif.id);
    setPopoverAberto(false);
    if (notif.consulta_id) {
      navigate(`/prontuario/${notif.consulta_id}`);
    } else if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <>
      <AtualizacaoBanner />
      <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
        <TopNavbar />
        
        {/* Notificações injetadas usando position fixed no topo direito, ao lado do Perfil */}
        <div className="fixed top-0 right-[4.5rem] md:right-16 z-50 h-14 flex items-center pr-2 pointer-events-none">
             <div className="pointer-events-auto flex items-center h-full">
              <Popover open={popoverAberto} onOpenChange={setPopoverAberto}>
                <PopoverTrigger asChild>
                  <button className="relative p-2 hover:bg-muted rounded-full transition-colors outline-none cursor-pointer">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    {naoLidas > 0 && (
                      <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground 
                        text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-background">
                        {naoLidas}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-4 border-b flex justify-between items-center bg-muted/30 pt-3 pb-3">
                    <h3 className="font-semibold text-sm">Notificações</h3>
                    <button onClick={marcarTodasLidas} className="text-xs text-primary hover:underline font-medium">
                      Marcar todas como lidas
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notificacoes.length === 0 ? (
                      <div className="text-center py-12 px-4">
                        <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Nenhuma notificação por aqui</p>
                      </div>
                    ) : (
                      notificacoes.map(n => (
                        <div 
                          key={n.id}
                          className={`p-4 border-b hover:bg-muted/50 transition-colors relative group/notif ${!n.lida ? 'bg-primary/5' : ''}`}
                        >
                          <div className="flex gap-3">
                            <span className="text-xl flex-shrink-0 cursor-pointer" onClick={() => handleClickNotificacao(n)}>
                              {n.icone}
                            </span>
                            <div className="flex-1 space-y-1 cursor-pointer" onClick={() => handleClickNotificacao(n)}>
                              <p className="text-sm font-semibold leading-tight">{n.titulo}</p>
                              <p className="text-xs text-muted-foreground leading-normal">{n.mensagem}</p>
                              <p className="text-[10px] text-muted-foreground/60">{n.tempo}</p>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                              {!n.lida && <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0" />}
                              <button
                                onClick={(e) => { e.stopPropagation(); removerNotificacao(n.id); }}
                                className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover/notif:opacity-100"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t text-center">
                    <button 
                      onClick={() => { navigate('/notificacoes'); setPopoverAberto(false); }}
                      className="text-xs text-primary font-medium hover:underline py-1"
                    >
                      Ver todas as notificações
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
             </div>
        </div>

        {/* Main Content Area filling width */}
        <main className="flex-1 w-full mx-auto px-4 sm:px-6 md:px-8 py-6 pb-20 max-w-[1400px]">
           {children}
        </main>

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
              <button onClick={() => setMostrarBanner(false)} className="text-green-200 text-sm px-2">Agora não</button>
              <button onClick={handleInstalar} className="bg-white text-green-600 text-sm font-semibold px-3 py-1 rounded-lg">Instalar</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
