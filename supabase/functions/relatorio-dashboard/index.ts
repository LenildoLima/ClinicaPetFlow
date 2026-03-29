import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const hoje = new Date();
    const inicioDia = new Date(hoje.setHours(0, 0, 0, 0)).toISOString();
    const fimDia = new Date(hoje.setHours(23, 59, 59, 999)).toISOString();

    // Últimos 7 dias para gráfico
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);
    seteDiasAtras.setHours(0, 0, 0, 0);

    const [
      consultasHojeRes,
      tutoresRes,
      petsRes,
      financeiroHojeRes,
      consultasSemanaRes,
      proximasConsultasRes,
    ] = await Promise.all([
      // Total de consultas hoje
      supabase
        .from("consultas")
        .select("id, status")
        .gte("data_hora", inicioDia)
        .lte("data_hora", fimDia),

      // Total de tutores ativos
      supabase
        .from("tutores")
        .select("id", { count: "exact" })
        .eq("ativo", true),

      // Total de pets ativos
      supabase
        .from("pets")
        .select("id", { count: "exact" })
        .eq("ativo", true),

      // Faturamento do dia
      supabase
        .from("financeiro")
        .select("valor_final, status")
        .gte("criado_em", inicioDia)
        .lte("criado_em", fimDia),

      // Consultas dos últimos 7 dias para gráfico
      supabase
        .from("consultas")
        .select("data_hora, status")
        .gte("data_hora", seteDiasAtras.toISOString())
        .order("data_hora", { ascending: true }),

      // Próximas consultas do dia
      supabase
        .from("consultas")
        .select(`
          id, data_hora, tipo, status, motivo,
          pets ( nome, especie ),
          tutores ( nome, telefone ),
          usuarios ( nome )
        `)
        .gte("data_hora", inicioDia)
        .lte("data_hora", fimDia)
        .in("status", ["agendado", "confirmado", "em_atendimento"])
        .order("data_hora", { ascending: true })
        .limit(10),
    ]);

    // Processa faturamento
    const faturamentoDia = financeiroHojeRes.data?.reduce((acc: number, f: any) => {
      return f.status === "pago" ? acc + (f.valor_final || 0) : acc;
    }, 0) || 0;

    const faturamentoPendente = financeiroHojeRes.data?.reduce((acc: number, f: any) => {
      return f.status === "pendente" ? acc + (f.valor_final || 0) : acc;
    }, 0) || 0;

    // Processa gráfico dos 7 dias
    const graficoDias: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
      graficoDias[key] = 0;
    }

    consultasSemanaRes.data?.forEach((c: any) => {
      const d = new Date(c.data_hora);
      const key = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
      if (graficoDias[key] !== undefined) graficoDias[key]++;
    });

    const grafico = Object.entries(graficoDias).map(([dia, total]) => ({ dia, total }));

    // Consultas de hoje por status
    const consultasHoje = consultasHojeRes.data || [];
    const statusCount = consultasHoje.reduce((acc: any, c: any) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});

    return new Response(
      JSON.stringify({
        success: true,
        cards: {
          total_consultas_hoje: consultasHoje.length,
          consultas_agendadas: statusCount["agendado"] || 0,
          consultas_concluidas: statusCount["concluido"] || 0,
          total_tutores: tutoresRes.count || 0,
          total_pets: petsRes.count || 0,
          faturamento_dia: faturamentoDia,
          faturamento_pendente: faturamentoPendente,
        },
        grafico_semana: grafico,
        proximas_consultas: proximasConsultasRes.data || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
