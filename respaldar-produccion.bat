@echo off
chcp 65001 >nul
set PYTHONUTF8=1
echo ============================================
echo   Respaldo de la base de datos de PRODUCCION
echo ============================================
echo.
"%~dp0backend\.venv\Scripts\python.exe" "%~dp0backend\backup_prod.py"
echo.
pause
