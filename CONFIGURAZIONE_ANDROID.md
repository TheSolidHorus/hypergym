# 📱 Come collegare Android al Server Backend

## Il Problema

Quando usi l'app Android (emulatore o telefono fisico), **`localhost` non funziona** perché:
- `localhost` sul telefono = il telefono stesso
- `localhost` sull'emulatore = l'emulatore stesso
- Il tuo server è sul PC, non sul telefono!

---

## ✅ Soluzione Automatica (GIÀ IMPLEMENTATA)

L'app ora rileva automaticamente l'ambiente e usa l'URL corretto:

| Ambiente | URL usato |
|----------|-----------|
| Browser web (dev) | `http://localhost:8000` |
| Emulatore Android | `http://10.0.2.2:8000` |
| Telefono fisico | `http://192.168.0.4:8000` |

---

## 📝 Configurazione

### 1. Verifica il tuo IP

Apri PowerShell e digita:
```powershell
ipconfig
```

Cerca "Scheda Ethernet" o "Wi-Fi" e trova l'**Indirizzo IPv4**, ad esempio:
```
Indirizzo IPv4. . . . . . . . . . . . : 192.168.0.4
```

### 2. Aggiorna il file se necessario

Se il tuo IP cambia, modifica:
```
c:\Users\vitto\Desktop\PUMP\frontend\src\lib\api.js
```

Cerca questa riga e aggiorna con il TUO IP:
```javascript
// 5. Telefono Android fisico (usa IP del PC)
if (isAndroid) {
  return 'http://192.168.0.4:8000';  // ← CAMBIA QUESTO IP
}
```

### 3. Ricompila
```powershell
cd c:\Users\vitto\Desktop\PUMP\frontend
cmd /c npm run build
cmd /c npx cap sync android
```

---

## 🔥 Assicurati che il server sia avviato

**IMPORTANTE**: Il backend deve essere in esecuzione!

### Avvia il server:
```powershell
cd c:\Users\vitto\Desktop\PUMP\backend
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Oppure doppio click su:
```
c:\Users\vitto\Desktop\PUMP\AVVIA_SERVER.bat
```

### Verifica che funzioni:
Apri nel browser del PC:
```
http://localhost:8000/docs
```

Dovresti vedere la documentazione API.

---

## 📶 Firewall Windows

Se l'app su Android non riesce ancora a connettersi, controlla il firewall:

1. **Windows Defender Firewall** → "Consenti app"
2. Cerca **Python** o **uvicorn**
3. Abilita per **Rete privata** e **Rete pubblica**

Oppure crea una regola manuale:
```powershell
# Apri PowerShell come Amministratore
netsh advfirewall firewall add rule name="PUMP Backend" dir=in action=allow protocol=TCP localport=8000
```

---

## 🧪 Test di Connessione

### Dal browser del PC:
```
http://localhost:8000/docs
```

### Dal browser del telefono (stessa rete Wi-Fi):
```
http://192.168.0.4:8000/docs
```

Se questo funziona, l'app Android funzionerà!

---

## 🚨 Risoluzione Problemi

| Errore | Soluzione |
|--------|-----------|
| "Server non raggiungibile" | Server non avviato → Lancia `AVVIA_SERVER.bat` |
| "Connection refused" | Firewall blocca → Segui guida Firewall sopra |
| "Network error" | Telefono e PC su reti Wi-Fi diverse → Usa stessa rete |
| "Timeout" | IP errato → Verifica IP con `ipconfig` |

---

## 🌐 Alternative (Deploy Online)

Se vuoi evitare problemi di rete locale, puoi deployare il backend:

### Gratis:
- **Render.com** (750h/mese gratis)
- **Railway.app** (5$/mese gratis)
- **Fly.io** (3 VM gratis)

Poi cambia `.env` in:
```
VITE_API_URL=https://tuoapp.render.com
```

---

## ✅ Checklist Setup

- [ ] Server backend avviato (`AVVIA_SERVER.bat`)
- [ ] IP del PC verificato con `ipconfig`
- [ ] IP aggiornato in `frontend/src/lib/api.js` (se necessario)
- [ ] Frontend ricompilato: `npm run build`
- [ ] Sync Android: `npx cap sync android`
- [ ] Firewall permette porta 8000
- [ ] Telefono e PC sulla stessa rete Wi-Fi
- [ ] Test dal browser telefono: `http://IP-DEL-PC:8000/docs`

---

## 📲 CREARE UN FILE .APK (METODO VELOCE)

Se vuoi distribuire un file `.apk` installabile senza passare per il Play Store o configurare Android Studio:

1. Vai su **[PWABuilder.com](https://www.pwabuilder.com/)**.
2. Inserisci il link della tua app online: `https://pump-app-sand.vercel.app`.
3. Clicca su **Start**.
4. Quando ha finito l'analisi, clicca **Build SW PWA**.
5. Scegli **Android** e clicca **Download**.
6. Ti darà un file `.zip`. Estrailo e cerca il file `.apk` (spesso dentro `universal.apk` o simile).
7. Invia quel file al telefono (via WhatsApp, Drive, USB) e installalo!

**Nota:** 
- Prima di installare, il telefono chiederà di abilitare "Installa da origini sconosciute". Accetta.
- Questo APK è una "WebAPK" che usa Chrome per girare, ma sembra un'app nativa.
