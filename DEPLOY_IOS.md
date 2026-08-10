# 🍎 PUMP su iPhone (iOS) - Guida Deployment

Abbiamo trasformato PUMP in una **Web App (PWA)**!
Ora può essere installata su **iPhone**, **iPad**, **PC**, **Mac** senza passare dagli store.

---

## 🚀 Come Metterla Online (Gratis)

Dobbiamo caricare la cartella `dist` su un server statico sicuro (HTTPS).

### Opzione 1: Netlify Drop (La più facile, senza account)

1. Vai su: **https://app.netlify.com/drop**
2. Apri la cartella del progetto sul tuo PC:
   `c:\Users\vitto\Desktop\PUMP\frontend`
3. Trova la cartella **`dist`** (è stata creata dalla build).
4. **Trascina la cartella `dist`** dentro la pagina di Netlify Drop.
5. Aspetta qualche secondo... Fatto!
6. Ti darà un link (es: `https://glowing-sunshine-123456.netlify.app`).

### Opzione 2: Vercel CLI (Più professionale) - Primo Deploy

1. Apri un terminale nella cartella `frontend`:
   ```powershell
   cd c:\Users\vitto\Desktop\PUMP\frontend
   ```

2. Esegui:
   ```powershell
   npx vercel
   ```

3. Segui le istruzioni:
   - Login con GitHub/Email
   - "Set up and deploy?" → **Y**
   - "Which scope?" → Invio
   - "Link to existing project?" → **N**
   - "Project name?" → `pump-app` (o invio)
   - "Dictionary?" → Invio
   - "Want to modify settings?" → **N**

4. Alla fine ti darà: **Production: https://pump-app.vercel.app**

---

## 🔄 Aggiornamenti

Quando fai modifiche al codice:

1. Ricompila:
   ```powershell
   cd frontend
   npm run build
   ```

2. **Aggiornamento su Netlify:**
   - Trascina di nuovo la cartella `dist` nel sito Netlify Drop.

3. **Aggiornamento su Vercel:**
   Il sito si aggiorna automaticamente quando invii il codice su GitHub.

   a. Invia le modifiche a GitHub:
      ```powershell
      git add .
      git commit -m "Descrizione delle modifiche"
      git push
      ```
      *Vercel rileverà automaticamente il push e inizierà il deploy (ci vogliono circa 1-2 minuti).*

   b. **Opzione Manuale (se GitHub non va):**
      Se vuoi forzare l'aggiornamento direttamente dal tuo PC senza passare per GitHub:
      ```powershell
      npx vercel --prod
      ```
      *(Premi Invio a tutte le domande che ti fa)*

Gli utenti riceveranno l'aggiornamento automaticamente riaprendo l'app!

---

## 📲 Come Installare su iPhone

1. Invia il link (es: `pump-app.vercel.app`) al tuo amico con iPhone.
2. Apri il link con **Safari** (importante: usa Safari!).
3. Tocca il tasto **Condividi** (quadrato con freccia in alto).
4. Scorri in basso e tocca **"Aggiungi alla schermata Home"** ➕.
5. Tocca **Aggiungi**.

🎉 **L'icona PUMP apparirà tra le app!**
Aprendola, si vedrà a schermo intero come un'app nativa.

---

## 🔄 Aggiornamenti

Quando fai modifiche al codice:

1. Ricompila:
   ```powershell
   cd frontend
   npm run build
   ```

2. Ricarica su Netlify/Vercel:
   - Netlify: Trascina di nuovo la cartella `dist` nel sito.
   - Vercel: Esegui `
   `.

Gli utenti riceveranno l'aggiornamento automaticamente riaprendo l'app!

---

## ✅ Cosa Funziona?

- Login/Registrazione (Supabase)
- Schede
- Allenamenti
- Storico
- Offline (cache base)

**Tutto!**

---

## ❓ Domande?

**Q: Funziona anche su Android?**
A: Sì! Su Chrome → Menu (3 puntini) → Installa app.

**Q: Devono scaricare qualcosa?**
A: No, solo visitare il link.

**Q: È veloce?**
A: Sì, è salvata nel dispositivo.
