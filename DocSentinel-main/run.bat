@echo off
title Border Identity Intelligence System (BIIS) - Launcher
cls
echo ========================================================
echo   SIH26188 -- Border Identity Intelligence System (BIIS)
echo ========================================================
echo.

cd /d "%~dp0"

set "PYTHON_CMD="
where python >nul 2>nul
if %errorlevel% equ 0 (
    set "PYTHON_CMD=python"
) else (
    where py >nul 2>nul
    if %errorlevel% equ 0 (
        set "PYTHON_CMD=py"
    ) else if exist "%LocalAppData%\Programs\Python\Python313\python.exe" (
        set "PYTHON_CMD=%LocalAppData%\Programs\Python\Python313\python.exe"
    ) else if exist "%LocalAppData%\Programs\Python\Python312\python.exe" (
        set "PYTHON_CMD=%LocalAppData%\Programs\Python\Python312\python.exe"
    ) else if exist "%LocalAppData%\Programs\Python\Python311\python.exe" (
        set "PYTHON_CMD=%LocalAppData%\Programs\Python\Python311\python.exe"
    ) else if exist "C:\Python313\python.exe" (
        set "PYTHON_CMD=C:\Python313\python.exe"
    ) else (
        echo [ERROR] Python not found in PATH or standard directories.
        echo Please install Python 3.10+ and add it to system PATH.
        pause
        exit /b 1
    )
)

set "NPM_CMD=npm"
where npm >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\nodejs\npm.cmd" (
        set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"
    ) else (
        echo [ERROR] Node.js / NPM not found in PATH or standard directories.
        echo Please install Node.js [LTS version] from https://nodejs.org/
        pause
        exit /b 1
    )
)

if not exist "backend\venv\Scripts\python.exe" (
    echo [First-Time Setup] Initializing Python virtual environment...
    "%PYTHON_CMD%" -m venv backend\venv
    if not exist "backend\venv\Scripts\python.exe" (
        echo [Setup Warning] Virtualenv creation failed. Running with system Python environment.
        set "PY_RUN=%PYTHON_CMD%"
    ) else (
        echo [First-Time Setup] Installing backend dependencies...
        call "%~dp0backend\venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
        set "PY_RUN=%~dp0backend\venv\Scripts\python.exe"
    )
) else (
    set "PY_RUN=%~dp0backend\venv\Scripts\python.exe"
)

if not exist "frontend\node_modules" (
    echo [First-Time Setup] Installing frontend dependencies...
    cd /d "%~dp0frontend"
    call "%NPM_CMD%" install
    cd /d "%~dp0"
)

echo Starting Backend (FastAPI on http://localhost:8000)...
cd /d "%~dp0backend"
start "SIH Backend" cmd /k ""%PY_RUN%" -m uvicorn app.main:app --reload --port 8000"

echo Starting Frontend (React on http://localhost:5173)...
cd /d "%~dp0frontend"
start "SIH Frontend" cmd /k "%NPM_CMD% run dev"

cd /d "%~dp0"

echo Opening http://localhost:5173 in browser...
ping 127.0.0.1 -n 5 >nul
start http://localhost:5173

echo.
echo ========================================================
echo   System launched!
echo   Frontend: http://localhost:5173
echo   Backend API: http://localhost:8000/docs
echo ========================================================
echo.
pause


