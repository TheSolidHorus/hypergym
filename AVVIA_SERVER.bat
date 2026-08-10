@echo off
title HyperGym Server - Admin Dashboard
echo.
echo ========================================
echo    HYPERGYM SERVER - ADMIN DASHBOARD
echo ========================================
echo.
echo Avvio del server in corso...
echo.
echo Una volta avviato, apri nel browser:
echo    http://localhost:8000/dashboard
echo.
echo Password admin: hypergym2026admin
echo.
echo ----------------------------------------
echo Premi CTRL+C per fermare il server
echo ----------------------------------------
echo.

cd /d "%~dp0backend"
py -m uvicorn app.main:app --host 0.0.0.0 --port 8000

pause
