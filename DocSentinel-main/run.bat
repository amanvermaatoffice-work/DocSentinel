@echo off
title SIH Prototype Launcher
cls
echo ========================================================
echo   SIH26188 -- Border Identity Intelligence System (BIIS)
echo ========================================================
echo.

cd /d "%~dp0"

if not exist "backend\venv\Scripts\python.exe" (
    echo [First-Time Setup] Initializing Python virtual environment...
    python -m venv backend\venv
    echo [First-Time Setup] Installing backend dependencies...
    call backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
)

if not exist "frontend\node_modules" (
    echo [First-Time Setup] Installing frontend dependencies...
    cd frontend
    call npm install
    cd "%~dp0"
)

echo Starting Backend (FastAPI on http://localhost:8000)...
start "SIH Backend" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

echo Starting Frontend (React on http://localhost:5173)...
start "SIH Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Opening http://localhost:5173 in browser...
ping 127.0.0.1 -n 5 >nul
start http://localhost:5173

echo.
echo ========================================================
echo   System launched!
echo   Frontend: http://localhost:5173
echo   Backend API: http://localhost:8000/docs
echo ========================================================
