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

    // Busca consultas de amanhã que ainda não receberam lembrete
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataInicio = new Date(amanha.setHours(0, 0, 0, 0)).toISOString();
    const dataFim = new Date(amanha.setHours(23, 59, 59, 999)).toISOString();

    const { data: consultas, error } = await supabase
      .from("consultas")
      .select(`
        id, data_hora, tipo, motivo,
        pets ( nome, especie ),
        tutores ( nome, telefone, whatsapp, email )
      `)
      .eq("status", "agendado")
      .gte("data_hora", dataInicio)
      .lte("data_hora", dataFim);

    if (error) throw error;

    const lembretes = consultas?.map((c: any) => ({
      consulta_id: c.id,
      tutor: c.tutores?.nome,
      pet: c.pets?.nome,
      data_hora: c.data_hora,
      tipo: c.tipo,
      whatsapp: c.tutores?.whatsapp || c.tutores?.telefone,
      mensagem: `Olá ${c.tutores?.nome}! Lembrando que amanhã tem consulta do(a) ${c.pets?.nome} às ${new Date(c.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}. Tipo: ${c.tipo}. Até lá! 🐾`,
    }));

    return new Response(
      JSON.stringify({ success: true, total: lembretes?.length, lembretes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
