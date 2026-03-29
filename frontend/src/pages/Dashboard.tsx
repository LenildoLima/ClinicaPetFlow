import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Heart, Calendar, Clock, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Consulta {
  id: string;
  data_hora: string;
  motivo: string;
  pets: { nome: string } | null;
  tutores: { nome: string } | null;
}

const formatRole = (role: string) => {
  const roles: Record<string, string> = {
    admin: 'Administrador',
    veterinario: 'Veterinário',
    recepcionista: 'Recepcionista',
  };
  return roles[role] || role;
};

export default function Dashboard() {
  const { userData } = useAuth();
  const [totalTutores, setTotalTutores] = useState(0);
  const [totalPets, setTotalPets] = useState(0);
  const [consultasHoje, setConsultasHoje] = useState(0);
  const [proximasConsultas, setProximasConsultas] = useState<Consulta[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];

      const [tutoresRes, petsRes, consultasRes, proximasRes] = await Promise.all([
        supabase.from('tutores').select('id', { count: 'exact', head: true }),
        supabase.from('pets').select('id', { count: 'exact', head: true }),
        supabase.from('consultas').select('id', { count: 'exact', head: true })
          .gte('data_hora', `${today}T00:00:00-03:00`)
          .lte('data_hora', `${today}T23:59:59-03:00`),
        supabase.from('consultas').select('id, data_hora, motivo, pets(nome), tutores(nome)')
          .gte('data_hora', `${today}T00:00:00-03:00`)
          .lte('data_hora', `${today}T23:59:59-03:00`)
          .order('data_hora', { ascending: true })
          .limit(10),
      ]);

      setTotalTutores(tutoresRes.count ?? 0);
      setTotalPets(petsRes.count ?? 0);
      setConsultasHoje(consultasRes.count ?? 0);
      setProximasConsultas((proximasRes.data as unknown as Consulta[]) ?? []);
    };

    fetchStats();
  }, []);

  const stats = [
    { label: 'Consultas Hoje', value: consultasHoje, icon: Calendar, color: 'text-primary' },
    { label: 'Tutores Cadastrados', value: totalTutores, icon: Users, color: 'text-info' },
    { label: 'Pets Cadastrados', value: totalPets, icon: Heart, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          {userData && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              {formatRole(userData.cargo)}
            </div>
          )}
        </div>
        
        {userData && (
          <h2 className="text-xl font-semibold text-foreground">
            Bem-vindo(a), <span className="text-primary">{userData.nome}</span>!
          </h2>
        )}
        
        <p className="text-muted-foreground text-sm">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-sm">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Próximas Consultas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proximasConsultas.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Nenhuma consulta agendada para hoje.
            </p>
          ) : (
            <div className="space-y-3">
              {proximasConsultas.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-foreground">{c.pets?.nome ?? 'Pet'}</p>
                    <p className="text-sm text-muted-foreground">
                      Tutor: {c.tutores?.nome ?? '—'} • {c.motivo}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-primary">
                    {new Date(c.data_hora).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      timeZone: 'America/Sao_Paulo'
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
