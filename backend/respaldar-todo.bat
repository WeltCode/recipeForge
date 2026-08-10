@echo off
REM Copia de seguridad COMPLETA de produccion: base de datos + fotos/logos (R2).
REM Ejecutar SIEMPRE antes de un deploy con migraciones.
cd /d "%~dp0"
set PYTHONUTF8=1

echo ============================================
echo   RecipeForge - Respaldo COMPLETO de PROD
echo ============================================
echo.
echo [1/2] Base de datos (recetas, ingredientes, usuarios, restaurantes)...
"..\.venv\Scripts\python.exe" backup_prod.py
echo.
echo [2/2] Fotos de platos y logos (bucket R2)...
"..\.venv\Scripts\python.exe" backup_media.py
echo.
echo ============================================
echo   Listo. Copias en:  backend\backups\
echo ============================================
pause
