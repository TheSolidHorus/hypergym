# 🤖 Guida Deploy — AI Generator (Supabase Edge Function)

## Come funziona ora

```
App (React) → Supabase Edge Function "generate-plan" → Gemini API
```

✅ Zero server locale richiesto  
✅ Funziona da web, iOS, Android  
✅ La chiave API Gemini è al sicuro nelle Supabase Secrets  

---

## Deploy in 3 step

### Step 1 — Installa Supabase CLI

```powershell
npm install -g supabase
```

### Step 2 — Collega il progetto e fai il deploy della funzione

```powershell
cd C:\Users\vitto\Desktop\PUMP

# Login su Supabase
supabase login

# Collega al tuo progetto (ref: kmuovijjgivwupluuruh)
supabase link --project-ref kmuovijjgivwupluuruh

# Deploy della Edge Function
supabase functions deploy generate-plan
```

### Step 3 — Aggiungi la chiave Gemini come Secret

```powershell
supabase secrets set GEMINI_API_KEY=AIzaSyAN4wAISTMtI5V3r2yli3O58NvK2orPXUo
```

---

## In alternativa — via Dashboard Supabase (senza CLI)

1. Vai su https://supabase.com → il tuo progetto
2. **Edge Functions** → **New Function** → nome: `generate-plan`
3. Incolla il contenuto di `supabase/functions/generate-plan/index.ts`
4. **Settings → Secrets** → aggiungi `GEMINI_API_KEY`
5. Clicca **Deploy**

---

## Verifica che funziona

Vai nell'app → Archivio Schede o PlanEditor → bottone **✨ Genera con AI**  
Se la scheda viene generata → tutto ok! ✅

---

## Note

- La funzione è già scritta in `supabase/functions/generate-plan/index.ts`
- Il frontend usa già `supabase.functions.invoke("generate-plan")` → nessuna modifica extra necessaria
- Il backend Python non serve più per questa feature
