# 🚀 Migrare PUMP a Supabase (Backend Online 24/7)

## Perché Supabase?

✅ **Niente più server locale** → Funziona sempre, da qualsiasi dispositivo  
✅ **Database online** → PostgreSQL gratis fino a 500MB  
✅ **Autenticazione pronta** → Login, registrazione, password reset già fatti  
✅ **File storage** → Per certificati medici  
✅ **API automatiche** → Niente backend da scrivere  
✅ **GRATIS per sempre** (piano gratuito generoso)

---

## 📋 Setup Supabase (10 minuti)

### Passo 1: Crea Account (2 min)

1. Vai su: **https://supabase.com**
2. Click **"Start your project"**
3. Accedi con **GitHub** o email
4. Click **"New project"**

### Passo 2: Configura Progetto (3 min)

Compila il form:
- **Name**: `pump-app`
- **Database Password**: Scegli password sicura (SALVALA!)
- **Region**: `Europe West (Ireland)` ← più vicino
- **Pricing Plan**: **Free** (0$/mese)

Click **"Create new project"** → Aspetta 2-3 minuti

### Passo 3: Crea Database (3 min)

1. Sidebar → **SQL Editor**
2. Click **"+ New query"**
3. Copia TUTTO il contenuto di: `supabase_schema.sql`
4. Incolla nell'editor
5. Click **"Run"** (o CTRL+Enter)

Dovresti vedere: ✅ **"Success. No rows returned"**

### Passo 4: Configura Autenticazione (2 min)

1. Sidebar → **Authentication** → **Providers**
2. **Email** → Assicurati sia **Enabled** ✅
3. **Confirm email**: Spunta **"Disable"** (per sviluppo)
   - Questo evita di dover verificare email durante test
   - Riattiva in produzione!

### Passo 5: Copia Credenziali

1. Sidebar → **Project Settings** (⚙️ in basso)
2. **API**
3. Copia questi valori:

```
Project URL: https://xxx.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Passo 6: Configura Frontend

Apri: `frontend/src/lib/supabase.js`

Riga 8-9, incolla le tue credenziali:
```javascript
const SUPABASE_URL = 'https://xxx.supabase.co' // ← TUO URL
const SUPABASE_ANON_KEY = 'eyJhbGc...' // ← TUA KEY
```

---

## 🔄 Migrazione Backend → Supabase

Ora devo sostituire le chiamate al backend locale con Supabase. Vuoi che:

### Opzione A: Mantengo ENTRAMBI (Raccomandato per transizione)
- Backend locale per admin panel
- Supabase per app mobile
- Migrazione graduale

### Opzione B: Solo Supabase (Più pulito)
- Elimino completamente backend FastAPI
- Tutto su Supabase
- Admin panel su Supabase Dashboard

**Quale preferisci?** (consiglio **A** per non rompere nulla)

---

## 📊 Cosa cambia nell'app?

### Prima (Backend Locale):
```javascript
// Login
const res = await fetch('http://localhost:8000/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
})
```

### Dopo (Supabase):
```javascript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})
```

Molto più semplice! ✨

---

## 💾 Cosa succede ai dati esistenti?

Se hai già utenti nel database locale:
1. Posso creare uno script di migrazione
2. Oppure ricominci da zero (è in sviluppo, ok?)

**Hai dati importanti da migrare?**

---

## 🎯 Vantaggi Immediati

| Prima (Locale) | Dopo (Supabase) |
|----------------|----------------|
| Server da avviare manualmente | ✅ Sempre online |
| IP/firewall/NGROK | ✅ Funziona ovunque |
| Backup manuali | ✅ Backup automatici |
| Scalabilità limitata | ✅ Scalabile a milioni di utenti |
| Solo da rete locale | ✅ Anche da 4G/5G |

---

## 📱 Storage per Certificati Medici

Supabase include **Storage** gratis (1GB):

1. Creo bucket `certificates`
2. Upload certificato → Ritorna URL pubblico
3. Salvo URL nel profilo utente

Esempio:
```javascript
// Upload certificato
const { data } = await supabase.storage
  .from('certificates')
  .upload(`${userId}/certificato.pdf`, file)

// URL: https://xxx.supabase.co/storage/v1/object/public/certificates/...
```

---

## 🔐 Sicurezza

Supabase usa **Row Level Security (RLS)**:
- Ogni utente vede SOLO i propri dati
- Isolamento automatico
- Impossibile accedere ai dati altrui
- Già configurato nello schema SQL!

---

## 💰 Costi

### Piano FREE (Forever):
- ✅ 500MB database
- ✅ 1GB file storage
- ✅ 50.000 utenti attivi/mese
- ✅ Autenticazione illimitata
- ✅ Backup giornalieri (7 giorni)

**Più che sufficiente per PUMP!**

### Se cresci:
- **Pro**: $25/mese → 8GB database, 100GB storage
- **Team**: $599/mese → Solo per aziende grandi

---

## 🚀 Prossimi Passi

1. **ADESSO**: Crea account Supabase
2. **5 min**: Esegui schema SQL
3. **10 min**: Copio credenziali in `supabase.js`
4. **30 min**: Aggiorno il codice per usare Supabase
5. **TEST**: L'app funziona da qualsiasi rete! 🎉

---

## ❓ FAQ

**Q: Posso tornare al backend locale?**  
A: Sì! Tengo entrambe le versioni durante transizione.

**Q: E se Supabase chiude?**  
A: È open source! Puoi self-hostarlo o migrare facilmente.

**Q: Devo pagare dopo un po'?**  
A: No, il piano free è per sempre. Solo se superi limiti generosi.

**Q: È complicato?**  
A: No! Più semplice del backend locale.

---

## 🎓 Iniziamo?

Ti guido passo-passo! Dimmi:

1. ✅ Ho creato account Supabase
2. ⏳ Sto per crearlo
3. ❓ Ho domande prima di iniziare

Poi procediamo con la migrazione del codice! 🚀
