import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      reply: "pong — function is alive",
      hasKey: !!Deno.env.get("GEMINI_API_KEY"),
      keyLength: (Deno.env.get("GEMINI_API_KEY") ?? "").length,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
