@echo off
echo ===================================================
echo   Iniciando EPC Takeoff en Modo Local
echo ===================================================
cd /d "%~dp0frontend"
start "" http://localhost:3000
npm.cmd run dev
pause
