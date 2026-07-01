@echo off
REM ===================================================
REM  RecipeForge - Arranca Backend y Frontend a la vez
REM  Abre cada uno en su propia ventana de terminal.
REM ===================================================

echo Iniciando RecipeForge completo...
echo  - Backend  -^> http://localhost:8000
echo  - Frontend -^> http://localhost:5173
echo.

start "RecipeForge Backend" cmd /k "%~dp0iniciar-backend.bat"
start "RecipeForge Frontend" cmd /k "%~dp0iniciar-frontend.bat"

echo Listo. Se han abierto dos ventanas (backend y frontend).
echo Puedes cerrar esta ventana.
timeout /t 3 >nul
