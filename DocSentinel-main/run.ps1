# One-Click Launcher & Auto-Installer for SIH Prototype
$Root = $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SIH26188 -- Border Identity Intelligence System (BIIS)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Check Python VENV
if (-not (Test-Path "$Root\backend\venv\Scripts\python.exe")) {
    Write-Host "[First-Time Setup] Initializing Python virtual environment..." -ForegroundColor Yellow
    python -m venv "$Root\backend\venv"
    Write-Host "[First-Time Setup] Installing backend dependencies..." -ForegroundColor Yellow
    & "$Root\backend\venv\Scripts\python.exe" -m pip install -r "$Root\backend\requirements.txt"
}

# Check Frontend node_modules
if (-not (Test-Path "$Root\frontend\node_modules")) {
    Write-Host "[First-Time Setup] Installing frontend npm packages..." -ForegroundColor Yellow
    Set-Location "$Root\frontend"
    npm install
    Set-Location $Root
}

Write-Host "Starting Backend (FastAPI)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd /d `"$Root\backend`" && .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

Write-Host "Starting Frontend (React)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd /d `"$Root\frontend`" && npm run dev"

Write-Host "Opening http://localhost:5173..." -ForegroundColor Green
Start-Sleep -Seconds 4
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "System launched! Check http://localhost:5173" -ForegroundColor Green
