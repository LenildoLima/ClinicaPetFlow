import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAuth } from '@/contexts/AuthContext';
import { PawPrint, LayoutDashboard, Heart, Calendar, LogOut, Users, Settings, DollarSign, FileText, Wallet, UserCircle, Package, Tag, Landmark, FileBarChart } from 'lucide-react';
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

export default function AppLayout({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [mostrarBanner, setMostrarBanner] = useState(false);

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
          <header className="h-14 flex items-center border-b px-4 bg-card">
            <SidebarTrigger />
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
