# 📧 Configurazione SMTP Gmail per invio OTP

## Perché serve?
L'app PUMP invia codici OTP via email per verificare l'account degli utenti. Per inviare email automatiche serve configurare un account Gmail con una "Password per le app".

---

## 🛠️ Passaggi per configurare Gmail

### 1️⃣ Vai alle impostazioni di sicurezza Google
Apri nel browser:
```
https://myaccount.google.com/security
```

### 2️⃣ Attiva la "Verifica in due passaggi"
- Scorri fino a **"Verifica in due passaggi"**
- Se non è attiva, clicca **"Inizia"** e segui i passaggi
- Serve per poter generare password per le app

### 3️⃣ Genera una "Password per le app"
Apri:
```
https://myaccount.google.com/apppasswords
```

- Clicca **"Crea"** o **"Seleziona app"**
- Nome app: `PUMP Backend`
- Google genererà una password di 16 caratteri tipo: `abcd efgh ijkl mnop`
- **COPIALA** subito (non potrai più vederla)

### 4️⃣ Inserisci le credenziali nel file `.env`
Apri il file:
```
c:\Users\vitto\Desktop\PUMP\backend\.env
```

E compila:
```env
SMTP_EMAIL=tuaemail@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
```

⚠️ **Rimuovi gli spazi** dalla password Gmail! Esempio:
- ❌ `abcd efgh ijkl mnop`
- ✅ `abcdefghijklmnop`

### 5️⃣ Riavvia il server
```powershell
# Ferma il server (CTRL+C)
# Poi riavvia
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## ✅ Test
1. Registra un nuovo utente sull'app
2. Controlla la tua email: dovresti ricevere il codice OTP
3. Se non arriva, guarda nel terminale del server: verrà stampato lì

---

## 🔒 Sicurezza
- La password per le app è **specifica per PUMP**, non è la password del tuo account Gmail
- Se compromessa, puoi revocarla da Google senza cambiare la password principale
- **NON condividere** il file `.env` (è già in .gitignore)

---

## 🆘 Problemi comuni

| Errore | Soluzione |
|--------|-----------|
| "Password errata" | Controlla di aver copiato bene la password senza spazi |
| "Verifica in 2 passaggi richiesta" | Attiva la 2FA prima di generare la password |
| "Email non inviata" | Controlla che SMTP_PORT sia `587` |
| Email arriva in spam | Normale la prima volta, poi Gmail imparerà |

---

## 📝 Alternative a Gmail (future)
- **SendGrid** (gratis fino a 100 email/giorno)
- **Amazon SES** (pay-per-use, molto economico)
- **Resend** (moderna API, 100 email/giorno gratis)
