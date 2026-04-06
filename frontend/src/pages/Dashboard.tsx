import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus,
  MessageCircle,
  LayoutDashboard,
  ArrowRight,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, eachDayOfInterval, format } from 'date-fns';
const formatDateFns = format;
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';

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
  const [graficoFinanceiro, setGraficoFinanceiro] = useState<any[]>([]);
  const [proximasConsultas, setProximasConsultas] = useState<ConsultaEdge[]>([]);
  const [financeiroFilter, setFinanceiroFilter] = useState<'dia' | 'mes' | 'ano'>('dia');

  useEffect(() => {
    const fetchDashboardFallback = async () => {
      try {
        const hoje = new Date();
        // Usar formato ISO com 'T' mas sem o offset manual, ou formatar para o padrão do Postgres
        const inicioDiaStr = formatDateFns(startOfDay(hoje), 'yyyy-MM-dd HH:mm:ss');
        const fimDiaStr = formatDateFns(endOfDay(hoje), 'yyyy-MM-dd HH:mm:ss');
        const inicioMesStr = formatDateFns(startOfMonth(hoje), 'yyyy-MM-dd HH:mm:ss');

        const [consultasRes, tutoresRes, petsRes, financeiroRes, proximasRes, estoqueRes] = await Promise.all([
          supabase.from('consultas').select('id, status, prontuarios(id)').gte('data_hora', inicioDiaStr).lte('data_hora', fimDiaStr),
          supabase.from('tutores').select('id', { count: 'exact' }).eq('ativo', true),
          supabase.from('pets').select('id', { count: 'exact' }).eq('ativo', true),
          supabase.from('financeiro').select('valor_final, status, criado_em').gte('criado_em', inicioMesStr).lte('criado_em', fimDiaStr),
          supabase.from('consultas').select('id, data_hora, tipo, status, pets(nome), tutores(nome), prontuarios(id)').gte('data_hora', inicioDiaStr).lte('data_hora', fimDiaStr).order('data_hora', { ascending: true }),
          supabase.from('estoque_produtos').select('id, estoque_atual, estoque_minimo').eq('ativo', true)
        ]);

        const totalConsultasHoje = consultasRes.data?.length || 0;
        const estoqueBaixo = estoqueRes.data?.filter(p => p.estoque_atual <= p.estoque_minimo).length || 0;
        
        const consultasMapeadas = (consultasRes.data || []).map(c => ({
          ...c,
          status: (c.prontuarios && c.prontuarios.length > 0) ? 'concluido' : c.status
        }));

        // Faturamento Mensal (considerando do dia 1 até o fim de hoje)
        const faturamentoMes = financeiroRes.data?.filter(f => f.status === 'pago').reduce((acc, f) => acc + (f.valor_final || 0), 0) || 0;
        const faturamentoDiaCount = financeiroRes.data?.filter(f => f.status === 'pago' && formatDateFns(new Date(f.criado_em), 'yyyy-MM-dd') === formatDateFns(hoje, 'yyyy-MM-dd'))
          .reduce((acc, f) => acc + (f.valor_final || 0), 0) || 0;

        setCards({
          total_consultas_hoje: totalConsultasHoje,
          consultas_agendadas: consultasMapeadas.filter(c => c.status === 'agendado').length,
          consultas_concluidas: consultasMapeadas.filter(c => c.status === 'concluido').length,
          total_tutores: tutoresRes.count || 0,
          total_pets: petsRes.count || 0,
          faturamento_dia: faturamentoDiaCount,
          faturamento_mes: faturamentoMes,
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
          .slice(0, 10); // Aumentado para 10 itens para garantir visibilidade

        setProximasConsultas(proximas);
        
        // --- Gráfico de Consultas (Últimos 7 dias) ---
        const seteDiasAtras = subDays(hoje, 6);
        const inicioBuscaSemana = formatDateFns(startOfDay(seteDiasAtras), 'yyyy-MM-dd HH:mm:ss');
        
        const { data: consultasSemana } = await supabase
          .from('consultas')
          .select('data_hora')
          .gte('data_hora', inicioBuscaSemana)
          .order('data_hora', { ascending: true });

        const days = eachDayOfInterval({ start: seteDiasAtras, end: hoje });
        const graficoConsultas = days.map(day => {
          const dayStr = formatDateFns(day, 'yyyy-MM-dd');
          const count = consultasSemana?.filter(c => formatDateFns(new Date(c.data_hora), 'yyyy-MM-dd') === dayStr).length || 0;
          return { dia: formatDateFns(day, 'eee dd', { locale: ptBR }), total: count };
        });
        setGraficoSemana(graficoConsultas);

      } catch (err) {
        console.error('Erro no fallback:', err);
      }
    };

    fetchDashboardFallback();
    setLoading(false);
  }, []);

  // Fetch Financeiro Data based on Filter
  useEffect(() => {
    const fetchFinanceiroData = async () => {
      const hoje = new Date();
      let start: Date, end: Date;

      if (financeiroFilter === 'dia') {
        start = startOfDay(hoje);
        end = endOfDay(hoje);
      } else if (financeiroFilter === 'mes') {
        start = startOfMonth(hoje);
        end = endOfMonth(hoje);
      } else {
        start = startOfYear(hoje);
        end = endOfYear(hoje);
      }

      const startStr = formatDateFns(start, 'yyyy-MM-dd HH:mm:ss');
      const endStr = formatDateFns(end, 'yyyy-MM-dd HH:mm:ss');

      const { data: financeiroData } = await supabase
        .from('financeiro')
        .select('valor_final, criado_em, status')
        .eq('status', 'pago')
        .gte('criado_em', startStr)
        .lte('criado_em', endStr);

      let breakdown: any[] = [];
      if (financeiroFilter === 'dia') {
        for (let i = 0; i < 24; i += 2) {
          const h = i.toString().padStart(2, '0');
          const total = financeiroData?.filter(f => {
            const date = new Date(f.criado_em);
            const hour = date.getHours();
            return hour >= i && hour < (i + 2);
          }).reduce((acc, curr) => acc + Number(curr.valor_final || 0), 0) || 0;
          breakdown.push({ label: `${h}:00`, valor: total });
        }
      } else if (financeiroFilter === 'mes') {
        const daysInMonth = eachDayOfInterval({ start, end });
        breakdown = daysInMonth.map(day => {
          const dayStr = formatDateFns(day, 'yyyy-MM-dd');
          const total = financeiroData?.filter(f => {
            const fDate = new Date(f.criado_em);
            return formatDateFns(fDate, 'yyyy-MM-dd') === dayStr;
          }).reduce((acc, curr) => acc + Number(curr.valor_final || 0), 0) || 0;
          return { label: formatDateFns(day, 'dd'), valor: total };
        });
      } else {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        breakdown = months.map((m, idx) => {
          const total = financeiroData?.filter(f => new Date(f.criado_em).getMonth() === idx).reduce((acc, curr) => acc + Number(curr.valor_final || 0), 0) || 0;
          return { label: m, valor: total };
        });
      }
      setGraficoFinanceiro(breakdown);
    };

    fetchFinanceiroData();
  }, [financeiroFilter]);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'agendado': return <Badge className="bg-blue-500">Agendado</Badge>;
      case 'em_atendimento': return <Badge className="bg-yellow-500 text-yellow-950 text-white">Em Atendimento</Badge>;
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
    { label: 'Agenda Hoje', value: cards.total_consultas_hoje || 0, icon: Clock, color: 'text-orange-500', sub: 'Consultas' },
    { label: 'Estoques Baixos', value: cards.estoque_baixo || 0, icon: AlertCircle, color: 'text-red-500', sub: 'Alertas' },
    { label: 'Serviços Concluídos', value: cards.consultas_concluidas || 0, icon: Sparkles, color: 'text-blue-500', sub: 'Hoje' },
    { label: 'Faturamento Mensal', value: formatMoney(cards.faturamento_mes || 0), icon: DollarSign, color: 'text-emerald-500', sub: format(new Date(), 'MMMM', { locale: ptBR }) },
  ];

  return (
    <div className="space-y-8 pb-12">
      {loading ? (
        <div className="space-y-8 animate-pulse">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
           </div>
           <Skeleton className="h-64 rounded-[2.5rem]" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight">
                Olá, <span className="text-primary">{userData?.nome?.split(' ')[0]}</span> 👋
              </h1>
              <p className="text-muted-foreground font-medium">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })} • Painel Principal PetFlow
              </p>
            </div>
            {userData && (
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                {formatRole(userData.cargo)}
              </Badge>
            )}
          </div>

          {/* QUICK LAUNCHER */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLuncher.map((tile, idx) => (
              <button
                key={idx}
                onClick={() => navigate(tile.path)}
                className="group relative flex flex-col items-center justify-center gap-4 p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-[1.25rem] ${tile.color} text-white shadow-lg transition-transform group-hover:scale-110`}>
                  <tile.icon className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <span className="block text-lg font-bold text-slate-800">{tile.label}</span>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{tile.shortcut}</span>
                </div>
              </button>
            ))}
          </section>

          {/* WELCOME SECTION */}
          <Card className="rounded-[2.5rem] border-none bg-gradient-to-br from-primary via-primary/90 to-emerald-600 text-white shadow-xl relative overflow-hidden group">
             <CardContent className="relative p-8 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" /> Bem-vindo(a) de volta!
                  </div>
                  <h3 className="text-4xl font-black">PetFlow Manager</h3>
                  <p className="text-primary-foreground/90 font-medium">Acompanhe seus atendimentos e controle suas finanças de forma simples e intuitiva.</p>
                  <div className="flex gap-3 pt-2">
                     <button onClick={() => navigate('/agenda')} className="px-6 py-3 bg-white text-primary font-bold rounded-xl hover:scale-105 transition-all">Novo Agendamento</button>
                     <button onClick={() => navigate('/caixa')} className="px-6 py-3 bg-black/20 text-white font-bold rounded-xl hover:bg-black/30 transition-all border border-white/10">Ir para o Caixa</button>
                  </div>
                </div>
                <div className="hidden md:flex h-40 w-40 bg-white/20 rounded-[2rem] items-center justify-center backdrop-blur-md border border-white/30 rotate-6 group-hover:rotate-0 transition-transform">
                   <Heart className="h-20 w-20 text-white animate-pulse" />
                </div>
             </CardContent>
          </Card>

          {/* MAIN STATS */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mainStats.map((stat, idx) => (
              <div key={idx} className="flex flex-col p-5 rounded-3xl bg-white border border-slate-100 shadow-sm">
                <div className={`p-2 w-fit rounded-lg ${stat.color.replace('text-', 'bg-')}/10 mb-3`}>
                   <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <span className="text-2xl font-black text-slate-800 leading-tight">{stat.value}</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <span className="text-[10px] font-bold text-slate-300 mt-1">{stat.sub}</span>
              </div>
            ))}
          </section>

          {/* CHARTS SECTION */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Consultation Chart */}
            <Card className="rounded-[2rem] border-transparent bg-white/60 backdrop-blur-sm shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                   <TrendingUp className="h-5 w-5 text-emerald-500" /> Tendência de Atendimentos
                </CardTitle>
                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Últimos 7 dias</div>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%" key={`consultas-chart`}>
                   <BarChart data={graficoSemana}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="dia" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8'}} />
                     <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8'}} />
                     <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                        labelStyle={{fontWeight: 'bold'}}
                     />
                     <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                   </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Chart with Filters */}
            <Card className="rounded-[2rem] border-transparent bg-white/60 backdrop-blur-sm shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                   <BarChart3 className="h-5 w-5 text-indigo-500" /> Recebimentos
                </CardTitle>
                <Select value={financeiroFilter} onValueChange={(val: any) => setFinanceiroFilter(val)}>
                  <SelectTrigger className="w-[100px] h-8 text-xs font-bold rounded-full bg-indigo-50 border-indigo-100 text-indigo-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dia" className="text-xs font-bold">Hoje</SelectItem>
                    <SelectItem value="mes" className="text-xs font-bold">Mês</SelectItem>
                    <SelectItem value="ano" className="text-xs font-bold">Ano</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%" key={`financeiro-${financeiroFilter}`}>
                   <BarChart data={graficoFinanceiro}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis 
                       dataKey="label" 
                       axisLine={false} 
                       tickLine={false} 
                       fontSize={10} 
                       tick={{fill: '#94a3b8'}} 
                       interval={financeiroFilter === 'mes' ? 4 : 0}
                     />
                     <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8'}} tickFormatter={(v) => `R$${v}`} />
                     <Tooltip 
                        formatter={(v: number) => [formatMoney(v), 'Recebido']}
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                     />
                     <Bar dataKey="valor" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={financeiroFilter === 'mes' ? 10 : 25} />
                   </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* UPCOMING APPOINTMENTS */}
          <section className="grid gap-6 md:grid-cols-[1fr_2fr]">
             <Card className="rounded-[2rem] border-transparent bg-white/60 backdrop-blur-xl shadow-lg border h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" /> Agenda de Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {proximasConsultas.length === 0 ? (
                    <p className="p-8 text-center text-slate-400 font-medium italic">Nenhum atendimento registrado para hoje.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {proximasConsultas.map((c, idx) => (
                        <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                           <div className="flex justify-between items-center mb-1">
                              <div>
                                <span className="font-bold text-slate-700 block">{c.pet_nome}</span>
                                <p className="text-[10px] text-slate-500 truncate max-w-[140px]">Tutor: {c.tutor_nome}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{c.horario}</span>
                                {getStatusBadge(c.status)}
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="p-4 border-t">
                     <button onClick={() => navigate('/agenda')} className="w-full py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center justify-center gap-1">Ver Agenda Completa <ArrowRight className="h-3 w-3" /></button>
                  </div>
                </CardContent>
             </Card>
             
             {/* Small Insight / Tip */}
             <div className="flex flex-col justify-center p-8 rounded-[2rem] bg-slate-50 border border-dashed border-slate-200">
                <h4 className="text-xl font-bold text-slate-800 mb-2">Dica de Gestão</h4>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Mantenha seu estoque sempre atualizado para receber alertas automáticos de reposição. Atualmente você tem <span className="font-bold text-red-500">{cards.estoque_baixo} itens</span> abaixo do limite mínimo.
                </p>
                <button onClick={() => navigate('/estoque')} className="w-fit px-6 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-all">Verificar Estoque</button>
             </div>
          </section>
          
          {/* WhatsApp Button */}
          <a href="https://wa.me/5587981358055" target="_blank" className="fixed bottom-10 right-10 z-50 bg-green-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center justify-center">
            <MessageCircle className="h-7 w-7" />
          </a>
        </>
      )}
    </div>
  );
}
