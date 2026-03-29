import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { consulta_id, motivo_cancelamento } = await req.json();

    if (!consulta_id) {
      return new Response(
        JSON.stringify({ success: false, error: "consulta_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca a consulta
    const { data: consulta, error: errConsulta } = await supabase
      .from("consultas")
      .select("id, status, tutor_id")
      .eq("id", consulta_id)
      .single();

    if (errConsulta || !consulta) throw new Error("Consulta não encontrada");

    if (consulta.status === "cancelado") {
      return new Response(
        JSON.stringify({ success: false, error: "Consulta já está cancelada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (consulta.status === "concluido") {
      return new Response(
        JSON.stringify({ success: false, error: "Não é possível cancelar uma consulta já concluída" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cancela a consulta
    const { error: errUpdate } = await supabase
      .from("consultas")
      .update({
        status: "cancelado",
        observacoes: motivo_cancelamento || "Cancelado sem motivo informado",
      })
      .eq("id", consulta_id);

    if (errUpdate) throw errUpdate;

    // Verifica se existe financeiro pendente e cancela também
    const { data: financeiro } = await supabase
      .from("financeiro")
      .select("id, status")
      .eq("consulta_id", consulta_id)
      .eq("status", "pendente")
      .single();

    if (financeiro) {
      await supabase
        .from("financeiro")
        .update({ status: "cancelado" })
        .eq("id", financeiro.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Consulta cancelada com sucesso",
        consulta_id,
        financeiro_cancelado: !!financeiro,
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
