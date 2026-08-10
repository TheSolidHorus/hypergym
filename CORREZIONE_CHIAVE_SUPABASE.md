# ⚠️ CORREZIONE CHIAVE SUPABASE

## Problema

Hai copiato la **SERVICE KEY** (`sb_secret_...`) invece della **ANON KEY**.

- ❌ SERVICE KEY = chiave privata lato server (PERICOLOSA nel frontend!)
- ✅ ANON KEY = chiave pubblica sicura per il frontend

---

## 🔧 Come Correggere (30 secondi)

### 1. Vai su Supabase Dashboard

URL: https://supabase.com/dashboard/project/kmuovijjgivwupluuruh

### 2. Settings → API

Sidebar in basso → **⚙️ Settings** → **API**

### 3. Trova "Project API keys"

Scorri fino a vedere:

```
Project API keys
┌────────────────────────────────────────────┐
│ anon public                                │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...   │  ← COPIA QUESTA!
│                                            │
│ service_role secret                        │
│ sb_secret_sg2RSeQuZ...                     │  ← NON QUESTA!
└────────────────────────────────────────────┘
```

### 4. Copia la chiave "anon public"

Click sull'icona 📋 accanto a **anon** **public**

### 5. Sostituisci in supabase.js

Apri: `frontend/src/lib/supabase.js`

Riga 9, sostituisci:
```javascript
const SUPABASE_ANON_KEY = 'eyJhbGc...' // ← INCOLLA LA CHIAVE ANON QUI
```

---

## ✅ Come Verificare

La chiave ANON inizia sempre con:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

La chiave SERVICE inizia con:
```
sb_secret_...
```

**Usa solo ANON nel frontend!**

---

## 📸 Screenshot Guida

Dove trovarla:

```
Dashboard Supabase
  └─ Sidebar sinistra: ⚙️ Settings
      └─ API
          └─ Project API keys
              └─ anon public ← QUESTA!
```

---

## 🚀 Dopo la Correzione

Una volta corretta la chiave:
1. ✅ Salva `supabase.js`
2. ✅ Dimmi "fatto"
3. ✅ Aggiorno Login.jsx e Register.jsx per usare Supabase
4. ✅ Test finale

---

## ❓ Perché è Importante?

| Chiave | Sicurezza | Uso |
|--------|-----------|-----|
| **ANON** | ✅ Sicura | Frontend, app mobile |
| **SERVICE** | ❌ PRIVATA | Solo backend server |

Se qualcuno vede la SERVICE KEY può:
- Cancellare il database
- Rubare tutti i dati
- Bypassare tutte le security rules

**MAI esporre SERVICE KEY nel codice frontend!**

---

Correggi la chiave e dimmi quando è fatto! 🔑
