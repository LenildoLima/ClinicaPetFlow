import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Heart, 
  Calendar, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  DollarSign, 
  AlertCircle 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ConsultaEdge {
  horario: string;
  pet_nome: string;
  tutor_nome: string;
  tipo: string;
  status: string;
}

const formatRole = (role: string) => {
  const roles: Record<string, string> = {
    admin: 'Administrador',
    veterinario: 'Veterinário',
    recepcionista: 'Recepcionista',
  };
  return roles[role] || role;
};

const formatMoney = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

export default function Dashboard() {
  const { userData } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<any>({});
  const [graficoSemana, setGraficoSemana] = useState<any[]>([]);
  const [proximasConsultas, setProximasConsultas] = useState<ConsultaEdge[]>([]);

  useEffect(() => {
    const fetchDashboardFallback = async () => {
      try {
        const hoje = new Date()
        const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)
        
        // Converter para UTC-3 conforme instruído
        const inicioDiaUTC = new Date(inicioDia.getTime() + (3 * 60 * 60 * 1000)).toISOString()
        const fimDiaUTC = new Date(inicioDia.getTime() + (27 * 60 * 60 * 1000)).toISOString()

        const [consultasRes, tutoresRes, petsRes, financeiroRes, proximasRes] = await Promise.all([
          supabase.from('consultas').select('id, status, prontuarios(id)').gte('data_hora', inicioDiaUTC).lte('data_hora', fimDiaUTC),
          supabase.from('tutores').select('id', { count: 'exact' }).eq('ativo', true),
          supabase.from('pets').select('id', { count: 'exact' }).eq('ativo', true),
          supabase.from('financeiro').select('valor_final, status').gte('criado_em', inicioDiaUTC).lte('criado_em', fimDiaUTC),
          supabase.from('consultas').select('id, data_hora, tipo, status, pets(nome), tutores(nome), prontuarios(id)').gte('data_hora', inicioDiaUTC).lte('data_hora', fimDiaUTC).order('data_hora', { ascending: true })
        ]);

        const totalConsultasHoje = consultasRes.data?.length || 0;
        
        // Mapear status derivado para o contador
        const consultasMapeadas = (consultasRes.data || []).map(c => ({
          ...c,
          status: (c.prontuarios && c.prontuarios.length > 0) ? 'concluido' : c.status
        }));

        setCards({
          total_consultas_hoje: totalConsultasHoje,
          consultas_agendadas: consultasMapeadas.filter(c => c.status === 'agendado').length,
          consultas_concluidas: consultasMapeadas.filter(c => c.status === 'concluido').length,
          total_tutores: tutoresRes.count || 0,
          total_pets: petsRes.count || 0,
          faturamento_dia: financeiroRes.data?.filter(f => f.status === 'pago').reduce((acc, f) => acc + (f.valor_final || 0), 0) || 0,
          faturamento_pendente: financeiroRes.data?.filter(f => f.status === 'pendente').reduce((acc, f) => acc + (f.valor_final || 0), 0) || 0,
        });

        // Filtrar apenas o que a Edge faria no DB: ['agendado', 'confirmado', 'em_atendimento'] baseados no status dinâmico
        const proximas: ConsultaEdge[] = (proximasRes.data || [])
          .map((c: any) => ({
            horario: new Date(c.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            pet_nome: c.pets?.nome || 'Pet',
            tutor_nome: c.tutores?.nome || 'Tutor',
            tipo: c.tipo || 'Consulta',
            status: (c.prontuarios && c.prontuarios.length > 0) ? 'concluido' : c.status,
            _data_hora: new Date(c.data_hora).getTime() // helper para ordenacao (supabase já ordenou array base)
          }))
          .filter(c => ['agendado','confirmado','em_atendimento'].includes(c.status))
          .slice(0, 10);

        setProximasConsultas(proximas);
        
        // Gerar gráfico dos últimos 7 dias
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);
        seteDiasAtras.setHours(0, 0, 0, 0);

        const { data: consultasSemana } = await supabase
          .from('consultas')
          .select('data_hora')
          .gte('data_hora', seteDiasAtras.toISOString())
          .order('data_hora', { ascending: true });

        const graficoBase = [];
        for (let i = 6; i >= 0; i--) {
          const data = new Date();
          data.setDate(data.getDate() - i);
          const label = data.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            timeZone: 'America/Sao_Paulo'
          });
          const dataStr = data.toLocaleDateString('en-CA', {
            timeZone: 'America/Sao_Paulo'
          });
          
          const total = consultasSemana?.filter(c => {
            const diaConsulta = new Date(c.data_hora).toLocaleDateString('en-CA', {
              timeZone: 'America/Sao_Paulo'
            });
            return diaConsulta === dataStr;
          }).length || 0;

          graficoBase.push({ dia: label, total });
        }

        setGraficoSemana(graficoBase);
      } catch (err) {
        console.error('Erro geral no fallback:', err);
      }
    };

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/relatorio-dashboard`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Edge Function fetch invalid');
        }

        const result = await response.json();
        console.log('resultado:', result);

        if (result && result.cards && Object.keys(result.cards).length > 0) {
          setCards(result.cards || {});
          setGraficoSemana(result.grafico_semana || []);
          setProximasConsultas(result.proximas_consultas || []);
        } else {
          // Empty dict returned or unparsed cards
          throw new Error('Edge Function retornou sem os agrupamentos esperados');
        }
      } catch (err) {
        console.error('Falha na Edge Function, buscando fallback direto', err);
        await fetchDashboardFallback();
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'agendada': return <Badge className="bg-blue-500">Agendada</Badge>;
      case 'em_andamento': return <Badge className="bg-yellow-500 text-yellow-950">Em Andamento</Badge>;
      case 'concluida': return <Badge className="bg-green-500">Concluída</Badge>;
      case 'cancelada': return <Badge className="bg-red-500">Cancelada</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const statCards = [
    { label: 'Consultas Hoje', value: cards.total_consultas_hoje || 0, icon: Calendar, color: 'text-primary' },
    { label: 'Agendadas', value: cards.consultas_agendadas || 0, icon: Clock, color: 'text-blue-500' },
    { label: 'Concluídas', value: cards.consultas_concluidas || 0, icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Tutores Cadastrados', value: cards.total_tutores || 0, icon: Users, color: 'text-indigo-500' },
    { label: 'Pets Cadastrados', value: cards.total_pets || 0, icon: Heart, color: 'text-rose-500' },
    { label: 'Faturamento do Dia', value: formatMoney(cards.faturamento_dia || 0), icon: DollarSign, color: 'text-emerald-600' },
    { label: 'A Receber', value: formatMoney(cards.faturamento_pendente || 0), icon: AlertCircle, color: 'text-orange-500' },
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

      {/* CARDS (lg:grid-cols-4) */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando relatório...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, idx) => (
              <Card key={idx} className="shadow-sm">
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

          <div className="grid gap-6 md:grid-cols-[2fr_1fr] lg:grid-cols-[2fr_1fr]">
            
            {/* GRÁFICO */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Consultas nos últimos 7 dias</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {graficoSemana.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados para os últimos dias.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={graficoSemana} 
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="dia" 
                        stroke="#888888" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        allowDecimals={false}
                        tickFormatter={(value) => `${value}`} 
                      />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}} 
                        contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                        formatter={(value) => [`${value} consultas`, 'Total']}
                      />
                      <Bar 
                        dataKey="total" 
                        fill="#16a34a" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={60}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* LISTA DE CONSULTAS */}
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
                    Nenhuma consulta agendada para listar.
                  </p>
                ) : (
                  <div className="space-y-3 h-[300px] overflow-auto pr-2">
                    {proximasConsultas.map((c, idx) => (
                      <div key={idx} className="flex flex-col gap-2 rounded-lg border p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-foreground">{c.pet_nome || 'Pet'}</p>
                            <p className="text-sm text-muted-foreground">Tutor: {c.tutor_nome || '—'}</p>
                          </div>
                          <span className="text-sm font-bold text-primary">
                            {c.horario} {/* O horário já virá em pt-BR segundo o prompt */}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{c.tipo}</span>
                          {getStatusBadge(c.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
