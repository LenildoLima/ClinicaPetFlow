import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { consulta_id, forma_pagamento, desconto = 0, itens } = await req.json();

    if (!consulta_id || !forma_pagamento || !itens?.length) {
      return new Response(
        JSON.stringify({ success: false, error: "Campos obrigatórios: consulta_id, forma_pagamento, itens" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca dados da consulta
    const { data: consulta, error: errConsulta } = await supabase
      .from("consultas")
      .select("id, tutor_id, pet_id")
      .eq("id", consulta_id)
      .single();

    if (errConsulta || !consulta) throw new Error("Consulta não encontrada");

    // Calcula valor total dos itens
    const valor_total = itens.reduce((acc: number, item: any) => {
      return acc + item.quantidade * item.valor_unitario;
    }, 0);

    // Cria registro financeiro
    const { data: financeiro, error: errFin } = await supabase
      .from("financeiro")
      .insert({
        consulta_id,
        tutor_id: consulta.tutor_id,
        descricao: `Consulta #${consulta_id.slice(0, 8)}`,
        valor_total,
        desconto,
        forma_pagamento,
        status: "pendente",
        data_vencimento: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (errFin) throw errFin;

    // Cria itens do financeiro
    const itensComId = itens.map((item: any) => ({
      financeiro_id: financeiro.id,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
    }));

    const { error: errItens } = await supabase
      .from("financeiro_itens")
      .insert(itensComId);

    if (errItens) throw errItens;

    // Atualiza status da consulta para concluído
    await supabase
      .from("consultas")
      .update({ status: "concluido" })
      .eq("id", consulta_id);

    return new Response(
      JSON.stringify({ success: true, financeiro_id: financeiro.id, valor_total, desconto, valor_final: valor_total - desconto }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
