@echo off
REM Разовая установка на Windows.
setlocal
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
    echo Не найден python. Установи Python 3.11+ с python.org и повтори.
    exit /b 1
)

if not exist ".venv" (
    echo ==^> Создаю виртуальное окружение .venv
    python -m venv .venv
)

echo ==^> Ставлю зависимости
.venv\Scripts\python.exe -m pip install --quiet --upgrade pip
.venv\Scripts\python.exe -m pip install --quiet -r requirements.txt

if not exist ".env" (
    copy /y .env.example .env >nul
    echo.
    echo ==^> Создан файл .env — впиши контакт в OSM_USER_AGENT и ключи API.
    echo.
)

echo ==^> Проверяю источники и ключи
.venv\Scripts\python.exe main.py --check-keys

echo.
echo Готово. Дальше:  run.bat "Казань"
endlocal
