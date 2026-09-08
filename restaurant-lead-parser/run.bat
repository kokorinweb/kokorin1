@echo off
REM Сбор лидов по городу.  run.bat "Казань" [лимит]
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Окружение не установлено. Запусти сначала: setup.bat
    exit /b 1
)

set "CITY=%~1"
set "LIMIT=%~2"
if "%CITY%"=="" (
    echo Укажи город:  run.bat "Казань"
    exit /b 2
)
if "%LIMIT%"=="" set "LIMIT=800"

set "OUT=output\leads.xlsx"
echo ==^> Город: %CITY%, лимит: %LIMIT%
echo.

.venv\Scripts\python.exe main.py --city "%CITY%" --limit %LIMIT% --min-confidence 85 --min-lead-score 50 --exclude-chains --resume --output "%OUT%"
endlocal
