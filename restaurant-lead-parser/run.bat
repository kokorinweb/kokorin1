@echo off
REM Сбор лидов.  run.bat                       - диалог
REM              run.bat "Казань"              - общепит
REM              run.bat "Казань" "барбершопы" - своя ниша
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Окружение не установлено. Запусти сначала: setup.bat
    exit /b 1
)

set "CITY=%~1"
set "NICHE=%~2"
set "LIMIT=%~3"
if "%CITY%"=="" (
    .venv\Scripts\python.exe main.py --interactive
    exit /b %errorlevel%
)
if "%LIMIT%"=="" set "LIMIT=800"

set "OUT=output\leads.xlsx"
echo ==^> Город: %CITY%
echo ==^> Ниша:  %NICHE%
echo ==^> Лимит: %LIMIT%
echo.

.venv\Scripts\python.exe main.py --city "%CITY%" --niche "%NICHE%" --limit %LIMIT% --min-confidence 85 --min-lead-score 50 --exclude-chains --resume --output "%OUT%"
endlocal
