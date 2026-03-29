import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const pet_id = url.searchParams.get("pet_id");

    if (!pet_id) {
      return new Response(
        JSON.stringify({ success: false, error: "pet_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca tudo em paralelo
    const [petRes, consultasRes, prontuariosRes, vacinasRes, examesRes] = await Promise.all([
      supabase
        .from("pets")
        .select("*, tutores(nome, telefone, email)")
        .eq("id", pet_id)
        .single(),

      supabase
        .from("consultas")
        .select("*, usuarios(nome)")
        .eq("pet_id", pet_id)
        .order("data_hora", { ascending: false }),

      supabase
        .from("prontuarios")
        .select("*, usuarios(nome), prescricoes(*)")
        .eq("pet_id", pet_id)
        .order("data_atendimento", { ascending: false }),

      supabase
        .from("vacinas")
        .select("*, usuarios(nome)")
        .eq("pet_id", pet_id)
        .order("data_aplicacao", { ascending: false }),

      supabase
        .from("exames")
        .select("*")
        .eq("pet_id", pet_id)
        .order("data_solicitacao", { ascending: false }),
    ]);

    if (petRes.error) throw new Error("Pet não encontrado");

    return new Response(
      JSON.stringify({
        success: true,
        pet: petRes.data,
        consultas: consultasRes.data || [],
        prontuarios: prontuariosRes.data || [],
        vacinas: vacinasRes.data || [],
        exames: examesRes.data || [],
        resumo: {
          total_consultas: consultasRes.data?.length || 0,
          total_vacinas: vacinasRes.data?.length || 0,
          total_exames: examesRes.data?.length || 0,
          ultima_consulta: consultasRes.data?.[0]?.data_hora || null,
          proxima_vacina: vacinasRes.data?.find((v: any) => v.data_reforco)?.data_reforco || null,
        },
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
