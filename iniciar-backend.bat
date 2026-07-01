@echo off
REM ============================================
REM  RecipeForge - Arranque del Backend (Django)
REM ============================================
title RecipeForge Backend

cd /d "%~dp0backend"

REM Verificar que existe el entorno virtual
if not exist ".venv\Scripts\activate.bat" (
    echo [ERROR] No se encontro el entorno virtual .venv
    echo Crealo con: python -m venv .venv
    echo Y luego instala: .venv\Scripts\python.exe -m pip install -r requirements.txt Pillow
    pause
    exit /b 1
)

echo Activando entorno virtual...
call .venv\Scripts\activate.bat

echo Iniciando servidor Django en http://localhost:8000 ...
echo (Pulsa CTRL+C para detener)
echo.
python manage.py runserver
