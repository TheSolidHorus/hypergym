# 🚨 TROUBLESHOOTING CONNESSIONE ANDROID

## ✅ Ho fatto queste modifiche:

1. **Rimosso hardcoded IP dal `.env`** → Ora auto-rileva Android
2. **Aggiunto logging nella console** → Puoi vedere quale URL viene usato
3. **Creata pagina di test** → Per diagnosticare il problema

---

## 📱 PASSI PER TESTARE (IMPORTANTE!)

### 1. Assicurati che il server sia avviato

```powershell
# Doppio click su:
c:\Users\vitto\Desktop\PUMP\AVVIA_SERVER.bat
```

Aspetta fino a vedere:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 2. Apri l'app su Android Studio

1. Click su **Run** (play verde)
2. Aspetta che l'app si apra

### 3. Usa la pagina di TEST

Sul telefono/emulatore, apri il browser Chrome e vai a:
```
http://localhost:3000/test.html
```

Oppure, nell'app PUMP, nella console JavaScript (DevTools Android):

**a) Collega DevTools**
```
chrome://inspect#devices
```

**b) Vedi quale URL viene rilevato**
Nella console dovresti vedere:
```
[API] Rilevamento ambiente: { isAndroid: true, hostname: ... }
[API] Telefono Android fisico → http://192.168.0.4:8000
[API] URL Backend configurato: http://192.168.0.4:8000
```

### 4. Testa la connessione MANUALMENTE

**Sul browser del telefono** (stessa rete Wi-Fi del PC):
```
http://192.168.0.4:8000/docs
```

**Risultati possibili:**

| Cosa vedi | Problema | Soluzione |
|-----------|----------|-----------|
| ✅ Documentazione API | **Funziona!** | L'app dovrebbe funzionare. Riavviala. |
| ❌ "Impossibile raggiungere" | **PC e telefono su reti diverse** | Connetti a stessa Wi-Fi |
| ❌ "Timeout" | **Firewall blocca** | Vedi sotto sezione Firewall |
| ❌ "Connessione rifiutata" | **Server non avviato** | Lancia `AVVIA_SERVER.bat` |

---

## 🔥 Firewall – Assicurati sia APERTO

### Verifica regola esistente:
```powershell
netsh advfirewall firewall show rule name="PUMP Backend"
```

### Se non esiste, creala:
```powershell
# PowerShell come AMMINISTRATORE
netsh advfirewall firewall add rule name="PUMP Backend" dir=in action=allow protocol=TCP localport=8000
```

### Oppure fallo manualmente:
1. **Windows Defender Firewall** → Impostazioni avanzate
2. **Regole connessioni in entrata** → Nuova regola
3. Tipo: **Porta**
4. Protocollo: **TCP**, Porta: **8000**
5. Azione: **Consenti connessione**
6. Profilo: **Privato + Pubblico**
7. Nome: **PUMP Backend**

---

## 📡 Verifica IP del PC

Il tuo IP attuale è: **192.168.0.4**

Se hai cambiato rete o riavviato il router, l'IP potrebbe essere cambiato:

```powershell
ipconfig
```

Cerca "Indirizzo IPv4" sotto "Scheda Ethernet" o "Wi-Fi".

Se l'IP è **diverso** da `192.168.0.4`:

1. Apri: `c:\Users\vitto\Desktop\PUMP\frontend\src\lib\api.js`
2. Cerca riga 41: `const pcIp = 'http://192.168.0.4:8000';`
3. Cambia con il TUO nuovo IP
4. Ricompila:
```powershell
cd c:\Users\vitto\Desktop\PUMP\frontend
cmd /c npm run build
cmd /c npx cap sync android
```

---

## 🧪 Test Rapido – Verifica Server

### Dal PC:
```
http://localhost:8000/docs
```
Dovresti vedere la documentazione API.

### Dal telefono (browser Chrome):
```
http://192.168.0.4:8000/docs
```
Se **NON funziona** → problema di rete/firewall, **NON dell'app**!

---

## 🔍 Debug Console – Vedi LOG

### Android Studio → Logcat

Filtra per: `chromium`

Cerca questi log:
```
[API] Rilevamento ambiente: ...
[API] Telefono Android fisico → http://192.168.0.4:8000
[API] URL Backend configurato: ...
```

Se vedi errori tipo:
```
net::ERR_CONNECTION_REFUSED
```
→ **Server non raggiungibile**

Se vedi:
```
net::ERR_CONNECTION_TIMED_OUT
```
→ **Firewall blocca** o **rete diversa**

---

## ⚡ Soluzione VELOCE (se tutto il resto fallisce)

### Usa NGROK (tunnel)

1. Scarica **ngrok**: https://ngrok.com/download
2. Avvia tunnel:
```powershell
ngrok http 8000
```
3. Copia URL tipo: `https://abc123.ngrok.io`
4. Modifica `frontend/.env`:
```
VITE_API_URL=https://abc123.ngrok.io
```
5. Ricompila:
```powershell
cmd /c npm run build
cmd /c npx cap sync android
```

Ora funzionerà da **qualsiasi rete**, anche 4G!

---

## 📞 Dimmi ESATTAMENTE cosa succede

Quando riprovi, dimmi:

1. **Dal browser del telefono, `http://192.168.0.4:8000/docs` funziona?**
   - [ ] SÌ → Server raggiungibile
   - [ ] NO → Problema rete/firewall

2. **Quale errore vedi nell'app quando provi il login?**
   - [ ] "Server non raggiungibile"
   - [ ] "Connection refused"
   - [ ] "Timeout"
   - [ ] Altro: _______________

3. **Stai usando:**
   - [ ] Emulatore Android
   - [ ] Telefono fisico

4. **Telefono e PC sono sulla stessa rete Wi-Fi?**
   - [ ] SÌ
   - [ ] NO
   - [ ] Non lo so

Con queste info posso dirti **esattamente** cosa fare!
