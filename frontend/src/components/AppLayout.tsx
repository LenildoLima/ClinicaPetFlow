import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PawPrint, LayoutDashboard, Heart, Calendar, LogOut, Users, Settings, DollarSign, FileText, Wallet, UserCircle, Package } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const allNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, roles: ['admin'] },
  { title: 'Minha Agenda', url: '/minha-agenda', icon: Calendar, roles: ['veterinario'] },
  { title: 'Agenda', url: '/agenda', icon: Calendar, roles: ['admin', 'recepcionista'] },
  { title: 'Tutores', url: '/tutores', icon: Users, roles: ['admin', 'recepcionista'] },
  { title: 'Pets', url: '/pets', icon: Heart, roles: ['admin', 'veterinario', 'recepcionista'] },
  { title: 'Prontuários', url: '/prontuarios', icon: FileText, roles: ['admin', 'veterinario'] },
  { title: 'Financeiro', url: '/financeiro', icon: DollarSign, roles: ['admin', 'recepcionista'] },
  { title: 'Caixa', url: '/caixa', icon: Wallet, roles: ['admin', 'recepcionista'] },
  { title: 'Estoque', url: '/estoque', icon: Package, roles: ['admin', 'recepcionista'] },
  { title: 'Configurações', url: '/configuracoes', icon: Settings, roles: ['admin', 'veterinario', 'recepcionista'] },
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

  const navItems = allNavItems.filter(item => 
    userData && item.roles.includes(userData.cargo)
  );

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

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
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

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
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
    </SidebarProvider>
  );
}
