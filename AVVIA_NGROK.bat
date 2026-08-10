@echo off
title PUMP - NGROK Tunnel
color 0A

echo.
echo ===============================================
echo   PUMP - Avvio Tunnel NGROK
echo ===============================================
echo.
echo Sto creando un tunnel pubblico per il server...
echo.
echo IMPORTANTE:
echo 1. NON chiudere questa finestra
echo 2. Copia l'URL che appare (es: https://abc123.ngrok.io)
echo 3. Usa quell'URL nell'app Android
echo.
echo ===============================================
echo.

REM Avvia NGROK sulla porta 8000
ngrok http 8000

pause
