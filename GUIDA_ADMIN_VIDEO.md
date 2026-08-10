# 🎥 SISTEMA GESTIONE VIDEO ESERCIZI - GUIDA

## 🔐 COME ACCEDERE ALLA DASHBOARD ADMIN

### Metodo 1: Link Diretto
1. Apri l'app PUMP
2. Vai su: **`https://pump-app-sand.vercel.app/admin`**
3. (Oppure in locale: `http://localhost:5173/admin`)

### Metodo 2: Dalla tua Applicazione
1. Apri l'app PUMP
2. Vai su **Profilo**
3. Nel menù (o da URL) vai su `/admin`

**NOTA IMPORTANTE:**
- Solo utenti con `role = 'admin'` o `role = 'trainer'` possono accedere
- Se non hai accesso, l'app ti rimanderà alla home con un alert

---

## 👤 IMPOSTARE UN UTENTE COME ADMIN

Per dare accesso admin a un utente:

### Via Supabase Dashboard:
1. Apri **Supabase** → **Table Editor**
2. Seleziona la tabella **`profiles`**
3. Trova l'utente che vuoi promuovere (cerca per email/nome)
4. Clicca sulla riga → Modifica
5. Cambia il campo **`role`** da `user` a **`admin`** (o `trainer`)
6. Salva

### Via SQL Editor (più veloce):
```sql
-- Sostituisci 'tua@email.com' con l'email dell'utente
UPDATE profiles
SET role = 'admin'
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'tua@email.com'
);
```

---

## 🎬 COME CARICARE VIDEO ESERCIZI

Una volta dentro la **Dashboard Admin**:

### Passo 1: Vai su Tab "Video Esercizi"
Clicca sulla tab **Video Esercizi** (icona 🎥)

### Passo 2: Compila il Form
1. **Nome Esercizio**: Inserisci il nome esatto (es: "Panca Piana", "Squat", "Stacchi")
   - 🚨 **IMPORTANTE:** Il nome deve corrispondere ESATTAMENTE al nome nell'esercizio delle schede
   - Maiuscole/minuscole non importano
   
2. **File Video**: Clicca "Choose File" e seleziona il video
   - Formato supportato: MP4, MOV, WebM, ecc.
   - **Max 50MB** per file
   - Consigliato: Video brevi (10-30 sec) che mostrano la corretta esecuzione

### Passo 3: Carica
Clicca **"Carica Video"**

Il sistema:
1. ✅ Valida il file (tipo + dimensione)
2. 📤 Carica su Supabase Storage
3. 💾 Salva i metadati nel DB
4. 🔄 Aggiorna automaticamente la lista

---

## 🗑️ ELIMINARE UN VIDEO

1. Nella lista video, trova il video da rimuovere
2. Clicca l'icona **🗑️ Trash** rossa
3. Conferma l'eliminazione

Il sistema cancellerà:
- ✅ Il file video da Storage
- ✅ I metadati dal database

---

## 🔍 COME FUNZIONA L'ASSOCIAZIONE AUTOMATICA

Quando crei un workout con un esercizio (es: "Panca Piana"):

1. L'app cerca in `exercise_videos` un record con `exercise_name = "Panca Piana"`
2. Se lo trova → 🎥 Mostra icona Play durante il workout
3. Se NON lo trova → Nessun video disponibile

**Quindi:** Assicurati che i nomi corrispondano esattamente!

---

## 📊 STRUTTURA DATABASE

### Tabella: `exercise_videos`
```sql
CREATE TABLE exercise_videos (
    id UUID PRIMARY KEY,
    exercise_name TEXT NOT NULL UNIQUE,  -- Nome esercizio (UNIQUE!)
    video_url TEXT NOT NULL,             -- URL pubblico Storage
    thumbnail_url TEXT,                  -- (Opzionale) Thumbnail
    duration_seconds INTEGER,            -- (Opzionale) Durata
    uploaded_by UUID,                    -- Admin che ha caricato
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Storage Bucket: `exercise-videos`
- **Public read**: Chiunque può vedere
- **Admin/Trainer only write**: Solo admin e trainer possono caricare/eliminare

---

## ✅ CHECKLIST DEPLOY

Hai già eseguito questi step, ma per riferimento futuro:

1. ✅ **SQL Setup**: Eseguito `supabase_exercise_videos_setup.sql`
2. ✅ **Frontend Deploy**: Buildato + deployato su Vercel
3. ✅ **Accesso Admin**: Impostato almeno 1 utente con `role = 'admin'`

---

## 🐛 TROUBLESHOOTING

### "Accesso negato"
→ Verifica che il tuo utente abbia `role = 'admin'` o `'trainer'`

### "Errore caricamento video"
→ Controlla:
- File è un video valido?
- Dimensione < 50MB?
- Hai connessione internet stabile?

### "Video non appare durante workout"
→ Controlla:
- Nome esercizio corrisponde esattamente?
- Il video è stato caricato correttamente (vedi lista)?

### "Storage error: policy ..."
→ Riesegui `supabase_exercise_videos_setup.sql` su Supabase SQL Editor

---

## 📱 ESEMPIO PRATICO

**Scenario:** Vuoi aggiungere video per "Panca Piana"

1. Vai su `/admin`
2. Tab "Video Esercizi"
3. Nome: `Panca Piana`
4. File: Seleziona `panca_piana_tutorial.mp4`
5. Carica
6. ✅ Fatto!

Ora quando un utente fa un workout con "Panca Piana", vedrà l'icona Play per guardare il video tutorial!

---

**Versione:** v2.0.1  
**Ultima modifica:** 2026-02-11
