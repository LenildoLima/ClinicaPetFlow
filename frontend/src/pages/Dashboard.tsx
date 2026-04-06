import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  AlertCircle,
  Package,
  ShoppingCart,
  Plus,
  MessageCircle,
  LayoutDashboard,
  ArrowRight
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
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
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<any>({});
  const [graficoSemana, setGraficoSemana] = useState<any[]>([]);
  const [proximasConsultas, setProximasConsultas] = useState<ConsultaEdge[]>([]);

  useEffect(() => {
    const fetchDashboardFallback = async () => {
      try {
        const hoje = new Date()
        const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)
        
        const inicioDiaUTC = new Date(inicioDia.getTime() + (3 * 60 * 60 * 1000)).toISOString()
        const fimDiaUTC = new Date(inicioDia.getTime() + (27 * 60 * 60 * 1000)).toISOString()

        const [consultasRes, tutoresRes, petsRes, financeiroRes, proximasRes, estoqueRes] = await Promise.all([
          supabase.from('consultas').select('id, status, prontuarios(id)').gte('data_hora', inicioDiaUTC).lte('data_hora', fimDiaUTC),
          supabase.from('tutores').select('id', { count: 'exact' }).eq('ativo', true),
          supabase.from('pets').select('id', { count: 'exact' }).eq('ativo', true),
          supabase.from('financeiro').select('valor_final, status').gte('criado_em', inicioDiaUTC).lte('criado_em', fimDiaUTC),
          supabase.from('consultas').select('id, data_hora, tipo, status, pets(nome), tutores(nome), prontuarios(id)').gte('data_hora', inicioDiaUTC).lte('data_hora', fimDiaUTC).order('data_hora', { ascending: true }),
          supabase.from('estoque_produtos').select('id, estoque_atual, estoque_minimo').eq('ativo', true)
        ]);

        const totalConsultasHoje = consultasRes.data?.length || 0;
        const estoqueBaixo = estoqueRes.data?.filter(p => p.estoque_atual <= p.estoque_minimo).length || 0;
        
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
          estoque_baixo: estoqueBaixo
        });

        const proximas: ConsultaEdge[] = (proximasRes.data || [])
          .map((c: any) => ({
            horario: new Date(c.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            pet_nome: c.pets?.nome || 'Pet',
            tutor_nome: c.tutores?.nome || 'Tutor',
            tipo: c.tipo || 'Consulta',
            status: (c.prontuarios && c.prontuarios.length > 0) ? 'concluido' : c.status,
          }))
          .filter(c => ['agendado','confirmado','em_atendimento'].includes(c.status))
          .slice(0, 5);

        setProximasConsultas(proximas);
        
        // Gráfico últimos 7 dias
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
          const label = data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', timeZone: 'America/Sao_Paulo' });
          const dataStr = data.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
          
          const total = consultasSemana?.filter(c => {
            const diaConsulta = new Date(c.data_hora).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
            return diaConsulta === dataStr;
          }).length || 0;

          graficoBase.push({ dia: label, total });
        }
        setGraficoSemana(graficoBase);
      } catch (err) {
        console.error('Erro no fallback:', err);
      }
    };

    const fetchDashboardData = async () => {
      setLoading(true);
      await fetchDashboardFallback();
      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'agendado': return <Badge className="bg-blue-500">Agendado</Badge>;
      case 'em_atendimento': return <Badge className="bg-yellow-500 text-yellow-950">Em Atendimento</Badge>;
      case 'concluido': return <Badge className="bg-green-500">Concluído</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const quickLuncher = [
    { label: 'Atendimento', icon: Calendar, color: 'bg-emerald-500', path: '/agenda', shortcut: 'F1' },
    { label: 'Novo Pet', icon: Heart, color: 'bg-rose-500', path: '/pets', shortcut: 'F2' },
    { label: 'Estoque', icon: Package, color: 'bg-sky-500', path: '/estoque', shortcut: 'F3' },
    { label: 'Financeiro', icon: DollarSign, color: 'bg-indigo-500', path: '/financeiro', shortcut: 'F4' },
  ];

  const mainStats = [
    { label: 'Agenda Hoje', value: cards.total_consultas_hoje || 0, icon: Clock, color: 'text-orange-500', sub: 'Pendentes' },
    { label: 'Estoques Baixos', value: cards.estoque_baixo || 0, icon: AlertCircle, color: 'text-red-500', sub: 'Itens' },
    { label: 'Banhos/Serviços', value: cards.consultas_concluidas || 0, icon: Sparkles, color: 'text-blue-500', sub: 'Concluídos' },
    { label: 'Faturamento', value: formatMoney(cards.faturamento_dia || 0), icon: DollarSign, color: 'text-emerald-500', sub: 'Hoje' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {loading ? (
        <div className="space-y-8">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
           </div>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
           </div>
        </div>
      ) : (
        <>
          {/* Header - Welcome */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight">
                Olá, <span className="text-primary">{userData?.nome?.split(' ')[0]}</span> 👋
              </h1>
              <p className="text-muted-foreground font-medium">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })} • Como está o PetFlow hoje?
              </p>
            </div>
            {userData && (
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                {formatRole(userData.cargo)}
              </Badge>
            )}
          </div>

          {/* QUICK LAUNCHER TILES */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLuncher.map((tile, idx) => (
              <button
                key={idx}
                onClick={() => navigate(tile.path)}
                className="group relative flex flex-col items-center justify-center gap-4 p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-20 h-20 ${tile.color} opacity-[0.03] rounded-bl-full group-hover:scale-150 transition-transform duration-500`} />
                <div className={`flex h-16 w-16 items-center justify-center rounded-[1.25rem] ${tile.color} text-white shadow-lg shadow-${tile.color.split('-')[1]}-200/50 group-hover:scale-110 transition-transform`}>
                  <tile.icon className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <span className="block text-lg font-bold text-slate-800">{tile.label}</span>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{tile.shortcut}</span>
                </div>
              </button>
            ))}
          </section>

          {/* MAIN STATS CARDS */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {mainStats.map((stat, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white/40 backdrop-blur-md border border-white/20 shadow-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-slate-800 leading-tight">{stat.value}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{stat.sub}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </section>

          <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
            {/* WELCOME / TOUR SECTION */}
            <Card className="rounded-[2.5rem] border-none bg-gradient-to-br from-primary via-primary/90 to-emerald-600 text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-1000" />
               <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl -ml-20 -mb-20" />
               
               <CardContent className="relative p-10 flex flex-col md:flex-row items-center gap-10">
                  <div className="flex-1 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold uppercase tracking-wider">
                      <LayoutDashboard className="h-3.5 w-3.5" /> Painel Geral
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-4xl font-black leading-tight">Bem vindo ao <br/><span className="text-emerald-300">PetFlow Manager</span></h3>
                       <p className="text-primary-foreground/90 font-medium text-lg max-w-md">
                         Gerencie sua clínica com facilidade através dos novos atalhos rápidos e visualize seus dados em tempo real.
                       </p>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-4">
                       <button onClick={() => navigate('/agenda')} className="h-12 px-8 bg-white text-primary font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                         Agendar Agora <ArrowRight className="h-4 w-4" />
                       </button>
                       <button onClick={() => navigate('/financeiro')} className="h-12 px-8 bg-black/20 backdrop-blur-md text-white font-bold rounded-2xl hover:bg-black/30 transition-all border border-white/10">
                         Ver Financeiro
                       </button>
                    </div>
                  </div>
                  
                  {/* Visual Illustration Placeholder */}
                  <div className="relative w-full md:w-64 h-64 flex items-center justify-center">
                     <div className="absolute inset-0 bg-white/5 rounded-[3rem] rotate-6 group-hover:rotate-12 transition-transform duration-500" />
                     <div className="absolute inset-0 bg-white/10 rounded-[3rem] -rotate-3 group-hover:-rotate-6 transition-transform duration-500" />
                     <div className="relative bg-white/20 backdrop-blur-xl border border-white/30 w-48 h-48 rounded-[2.5rem] shadow-2xl overflow-hidden flex items-center justify-center">
                        <Sparkles className="h-20 w-20 text-emerald-200 animate-pulse" />
                     </div>
                  </div>
               </CardContent>
            </Card>

            {/* UPCOMING APPOINTMENTS */}
            <Card className="rounded-[2.5rem] border-transparent bg-white/60 backdrop-blur-xl shadow-xl overflow-hidden border">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <CardTitle className="flex justify-between items-center text-xl font-black text-slate-800">
                  <div className="flex items-center gap-2">
                    <Clock className="h-6 w-6 text-primary" />
                    Agenda de Hoje
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none">{proximasConsultas.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {proximasConsultas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      <Calendar className="h-8 w-8" />
                    </div>
                    <p className="text-slate-400 font-semibold italic text-sm">Nenhuma consulta pendente para hoje.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[440px] overflow-auto custom-scrollbar">
                    {proximasConsultas.map((c, idx) => (
                      <div key={idx} className="group p-5 hover:bg-primary/[0.02] transition-colors">
                        <div className="flex justify-between items-start mb-2">
                           <div>
                             <h4 className="font-bold text-slate-800 text-lg group-hover:text-primary transition-colors">{c.pet_nome}</h4>
                             <p className="text-sm font-medium text-slate-500">Tutor: {c.tutor_nome}</p>
                           </div>
                           <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                             {c.horario}
                           </span>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{c.tipo}</span>
                           {getStatusBadge(c.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                   <button onClick={() => navigate('/agenda')} className="text-xs font-bold text-primary hover:underline flex items-center gap-1"> Ver Agenda Completa <ArrowRight className="h-3 w-3" /></button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Floating WhatsApp Button */}
          <a 
            href="https://wa.me/5587981358055" 
            target="_blank" 
            rel="noopener noreferrer"
            className="fixed bottom-10 right-10 z-50 group flex items-center gap-3 bg-green-500 text-white p-4 rounded-full shadow-2xl hover:bg-green-600 hover:scale-110 transition-all active:scale-95"
          >
            <div className="absolute right-full mr-3 px-3 py-1.5 bg-white text-slate-800 text-xs font-bold rounded-xl shadow-xl opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all whitespace-nowrap pointer-events-none border border-slate-100">
              Precisa de ajuda? 📞
            </div>
            <MessageCircle className="h-7 w-7" />
          </a>
        </>
      )}
    </div>
  );
}
