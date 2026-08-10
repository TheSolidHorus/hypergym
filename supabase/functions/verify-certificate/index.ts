// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// C-03: CORS ristretto ai domini autorizzati (non più "*")
const ALLOWED_ORIGINS = [
  "https://pump-app-sand.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ isValid: false, message: "ERRORE: GEMINI_API_KEY mancante nei Secrets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica autenticazione utente
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ isValid: false, message: "Non autenticato." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // A-05: Verifica il token e ottieni l'utente
    let userId: string | null = null;
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !user) {
        return new Response(
          JSON.stringify({ isValid: false, message: "Token non valido o scaduto." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = user.id;
    }

    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ isValid: false, message: "Parametri mancanti: imageBase64 e mimeType sono obbligatori." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Sei un sistema di verifica documenti. Analizza questo documento e determina se è un CERTIFICATO MEDICO DI IDONEITÀ SPORTIVA.
VALIDO (isValid: true): Certificato medico di idoneità, ricetta, cartella clinica.
NON VALIDO (isValid: false): Selfie, foto di paesaggi/cibo/animali, scontrini.
Rispondi SOLO con JSON: {"isValid": true, "confidence": 0.95, "message": "messaggio"}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const geminiPayload = {
      contents: [{ parts: [ { text: prompt }, { inlineData: { mimeType, data: imageBase64 } } ] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    };

    // Timeout di 30 secondi
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let geminiRes: Response;
    try {
      geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      if (fetchErr.name === "AbortError") {
        return new Response(
          JSON.stringify({ isValid: false, message: "Timeout durante la verifica AI. Riprova." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ isValid: false, message: `Errore Gemini API: ${geminiRes.status} - ${errText.substring(0, 50)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    const result = JSON.parse(rawText);

    const isValid = result.isValid === true;

    // A-05: Aggiorna il profilo dell'utente nel DB se il certificato è valido
    if (isValid && userId && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      await supabaseAdmin
        .from("profiles")
        .update({
          certificate_uploaded: true,
          certificate_verified_at: new Date().toISOString(),
        })
        .eq("id", userId);
      // Non blocchiamo la risposta in caso di errore DB — il frontend gestisce il proprio stato
    }

    return new Response(
      JSON.stringify({ isValid, message: result.message || (isValid ? "Certificato valido" : "Documento non valido") }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ isValid: false, message: `Errore interno server: ${err.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
