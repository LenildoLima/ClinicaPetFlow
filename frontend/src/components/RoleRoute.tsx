import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RoleRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

export default function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (userData && !allowedRoles.includes(userData.cargo)) {
    // Redireciona para a página inicial baseada no cargo
    const defaultRoutes: Record<string, string> = {
      admin: '/',
      veterinario: '/minha-agenda',
      recepcionista: '/agenda',
    };
    return <Navigate to={defaultRoutes[userData.cargo] || '/'} replace />;
  }

  return <>{children}</>;
}
