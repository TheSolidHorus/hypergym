# 🔑 CHIAVE ANCORA SBAGLIATA - Guida Corretta

## ❌ Quello che hai ora:
```
sb_publishable_BQ0GBuQ6tKQwjI4_5vgB7A_YLN3eIJi
```
Questa è una chiave "publishable" ma NON è quella giusta!

## ✅ Quella che serve:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFz...
```
Deve iniziare con `eyJ` e essere MOLTO più lunga (centinaia di caratteri)!

---

## 📍 DOVE TROVARLA (Passo-Passo)

### 1. Vai su Dashboard Supabase
```
https://supabase.com/dashboard/project/kmuovijjgivwupluuruh
```

### 2. Sidebar Sinistra → Settings (ultima icona ⚙️)

### 3. Nel menu Settings → Click su "API"

### 4. Scorri la pagina fino a vedere "Project API keys"

Vedrai qualcosa tipo:

```
┌─────────────────────────────────────────────────┐
│ Project API keys                                │
├─────────────────────────────────────────────────┤
│                                                 │
│ anon                                            │
│ public                                          │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3... │ ← QUESTA!
│ [📋 Copy]                                       │
│                                                 │
│ service_role                                    │
│ secret                                          │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3... │ ← NON questa!
│ [📋 Copy]                                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5. Click su [📋 Copy] accanto alla chiave "anon" "public"

**NON** quella "service_role" "secret"!

---

## 🎯 3 CHIAVI DIVERSE - Non Confonderle!

Supabase ha 3 tipi di chiavi:

| Nome | Prefisso | Lunghezza | Uso |
|------|----------|-----------|-----|
| **ANON** | `eyJhbGc...` | ~400 caratteri | ✅ Frontend (APP MOBILE) |
| SERVICE_ROLE | `eyJhbGc...` | ~400 caratteri | ❌ Solo backend server |
| Publishable | `sb_publishable...` | ~50 caratteri | ❌ Chiave vecchia, non usare |

---

## 🔍 Come Riconoscere la Chiave Giusta

### ✅ ANON - CORRETTA:
```javascript
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW92aWpqZ2l2d3VwbHV1cnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0MzY4NzIsImV4cCI6MjA1NTAxMjg3Mn0...'
```

Caratteristiche:
- ✅ Inizia con `eyJhbGc`
- ✅ Lunghissima (300-500 caratteri)
- ✅ Contiene punti (`.`) che separano 3 parti
- ✅ Ha `"role":"anon"` se la decodifichi

### ❌ SERVICE - SBAGLIATA:
```javascript
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW92aWpqZ2l2d3VwbHV1cnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTQzNjg3MiwiZXhwIjoyMDU1MDEyODcyfQ...'
```

Caratteristiche:
- ❌ Ha `"role":"service_role"` se la decodifichi
- ❌ È pericolosa nel frontend!

### ❌ PUBLISHABLE - SBAGLIATA:
```javascript
const SUPABASE_ANON_KEY = 'sb_publishable_BQ0GBuQ6tKQwjI4_5vgB7A_YLN3eIJi'
```

Caratteristiche:
- ❌ Inizia con `sb_publishable_`
- ❌ Corta (50-60 caratteri)
- ❌ Formato vecchio

---

## 🎬 Video Tutorial

Se hai difficoltà, guarda questo video ufficiale:
https://www.youtube.com/watch?v=dU7GwCOgvNY

Oppure screenshot:
https://supabase.com/docs/guides/api/api-keys

---

## 🆘 Alternativa: Usa il Browser

1. Apri: https://supabase.com/dashboard/project/kmuovijjgivwupluuruh/settings/api
2. Premi **F12** (DevTools)
3. Vai su **Console**
4. Incolla questo codice:

```javascript
// Trova la chiave ANON nella pagina
const anonKey = document.querySelector('code').textContent;
console.log('CHIAVE ANON:', anonKey);
```

5. Copia il risultato

---

## ✅ Quando è Corretta?

File `supabase.js` deve essere così:

```javascript
const SUPABASE_URL = 'https://kmuovijjgivwupluuruh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...'
                          ↑
                          Inizia con eyJ e è LUNGA!
```

---

## 🖼️ Screenshot Alternativo

Se proprio non riesci:
1. Fai screenshot della pagina Settings → API
2. Mandamelo
3. Ti dico esattamente quale copiare

---

**NON MOLLARE! È l'ultimo passo prima che tutto funzioni! 🚀**

Riprova a cercare la chiave "anon" "public" e dimmi cosa vedi!
