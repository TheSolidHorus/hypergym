# 🌐 Guida Completa NGROK per PUMP

## Cos'è NGROK?

NGROK crea un **tunnel pubblico** dal tuo PC a Internet. Così l'app Android può connettersi al tuo server locale **da qualsiasi rete** (anche 4G/5G)!

---

## 📥 Installazione NGROK

### Opzione 1: Download Manuale (PIÙ FACILE)

1. **Vai su:** https://ngrok.com/download
2. **Scarica** la versione Windows
3. **Estrai** `ngrok.exe` in: `c:\Users\vitto\Desktop\PUMP\`
4. Fatto!

### Opzione 2: Winget (se hai difficoltà)

```powershell
winget install ngrok
```

---

## 🚀 Utilizzo (SEMPLICISSIMO)

### 1. Assicurati che il server PUMP sia avviato

```powershell
# Doppio click su:
c:\Users\vitto\Desktop\PUMP\AVVIA_SERVER.bat
```

Aspetta fino a vedere:
```
INFO: Uvicorn running on http://0.0.0.0:8000
```

### 2. Avvia NGROK

**Doppio click su:**
```
c:\Users\vitto\Desktop\PUMP\AVVIA_NGROK.bat
```

**OPPURE** manualmente:
```powershell
cd c:\Users\vitto\Desktop\PUMP
ngrok http 8000
```

### 3. Copia l'URL NGROK

Vedrai qualcosa tipo:
```
Session Status    online
Forwarding        https://abc123-456-789.ngrok-free.app -> http://localhost:8000
```

**Copia questo URL:** `https://abc123-456-789.ngrok-free.app`

### 4. Configura l'app

Apri il file:
```
c:\Users\vitto\Desktop\PUMP\frontend\src\lib\api.js
```

Alla **riga 8**, incolla l'URL:
```javascript
const NGROK_URL = 'https://abc123-456-789.ngrok-free.app'; // ← INCOLLA QUI
```

### 5. Ricompila

```powershell
cd c:\Users\vitto\Desktop\PUMP\frontend
cmd /c npm run build
cmd /c npx cap sync android
```

### 6. Play su Android Studio

✅ **Ora l'app funzionerà da QUALSIASI rete!**

---

## 🎯 Vantaggi NGROK

| Problema | Soluzione NGROK |
|----------|-----------------|
| ❌ Firewall blocca | ✅ Bypass completo |
| ❌ Reti Wi-Fi diverse | ✅ Funziona anche con 4G |
| ❌ IP cambia sempre | ✅ URL pubblico stabile |
| ❌ Configurazione complessa | ✅ Un comando |
| ❌ Problemi debug locali | ✅ Funziona SEMPRE |

---

## 🔄 Ogni volta che sviluppi

1. Avvia server: `AVVIA_SERVER.bat`
2. Avvia tunnel: `AVVIA_NGROK.bat`
3. **L'URL può cambiare** ogni volta (nella versione gratuita)
4. Se cambia, aggiorna `api.js` e ricompila

---

## 💰 Costo

- **GRATIS** per sempre
- Limite: 1 tunnel alla volta (sufficiente!)
- URL cambia ad ogni riavvio (accettabile per dev)

**Versione PRO** (se vuoi):
- URL fisso (es: pump.ngrok.io)
- $8/mese
- Non necessario per sviluppo!

---

## 🧪 Test

Una volta configurato, testa dal **browser del telefono**:
```
https://abc123-456-789.ngrok-free.app/docs
```

Dovresti vedere la documentazione API!

---

## ⚠️ IMPORTANTE: NGROK e HTTPS

NGROK usa **HTTPS** (sicuro), quindi:

1. Il tuo backend vede le richieste come **HTTP** (porta 8000)
2. NGROK converte **HTTPS → HTTP** automaticamente
3. Nessuna configurazione SSL necessaria!

---

## 🐛 Problemi comuni

### "ngrok: command not found"
→ Scarica da https://ngrok.com/download e metti `ngrok.exe` nella cartella PUMP

### "Failed to complete tunnel connection"
→ Riavvia NGROK (chiudi e ri-lancia)

### "Tunnel not found"
→ Assicurati che il server sulla porta 8000 sia avviato PRIMA di NGROK

### L'URL NGROK non funziona
→ Nella versione gratuita potresti vedere una schermata intermedia "Visit Site". Clicca per continuare.

---

## 🎓 Esempio Completo

### Finestra 1: Server Backend
```
c:\Users\vitto\Desktop\PUMP> AVVIA_SERVER.bat
INFO: Uvicorn running on http://0.0.0.0:8000
```

### Finestra 2: NGROK Tunnel
```
c:\Users\vitto\Desktop\PUMP> ngrok http 8000

Forwarding: https://abc123.ngrok-free.app -> http://localhost:8000
```

### File: frontend/src/lib/api.js
```javascript
const NGROK_URL = 'https://abc123.ngrok-free.app';
```

### Terminal: Ricompila
```
cd frontend
npm run build
npx cap sync android
```

### Android Studio: Play ▶️

✅ **FUNZIONA!**

---

## 📞 Hai bisogno di aiuto?

Se non riesci a farlo funzionare, dimmi:

1. Hai scaricato ngrok.exe?
2. Cosa vedi quando lanci `AVVIA_NGROK.bat`?
3. Quale URL ti dà NGROK?

Ti aiuto subito!
