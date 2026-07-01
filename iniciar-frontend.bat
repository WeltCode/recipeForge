@echo off
REM =============================================
REM  RecipeForge - Arranque del Frontend (Vite)
REM =============================================
title RecipeForge Frontend

cd /d "%~dp0frontend"

REM Instalar dependencias si aun no existen
if not exist "node_modules" (
    echo Instalando dependencias de Node por primera vez...
    call npm install
)

echo Iniciando servidor de desarrollo Vite en http://localhost:5173 ...
echo (Pulsa CTRL+C para detener)
echo.
call npm run dev
