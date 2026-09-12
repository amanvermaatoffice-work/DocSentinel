# One-Click Launcher & Auto-Installer for SIH Prototype
$Root = $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SIH26188 -- Border Identity Intelligence System (BIIS)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Find Python
$PythonCmd = "python"
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        $PythonCmd = "py"
    } elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe") {
        $PythonCmd = "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe"
    } elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe") {
        $PythonCmd = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
    } else {
        Write-Host "[ERROR] Python was not found." -ForegroundColor Red
        pause
        exit 1
    }
}

# Check Python VENV
$PyVenv = "$Root\backend\venv\Scripts\python.exe"
if (-not (Test-Path $PyVenv)) {
    Write-Host "[First-Time Setup] Initializing Python virtual environment..." -ForegroundColor Yellow
    & $PythonCmd -m venv "$Root\backend\venv"
    if (Test-Path $PyVenv) {
        Write-Host "[First-Time Setup] Installing backend dependencies..." -ForegroundColor Yellow
        & $PyVenv -m pip install -r "$Root\backend\requirements.txt"
    } else {
        Write-Host "[Setup Warning] Virtualenv creation failed. Running with system Python environment." -ForegroundColor Red
        $PyVenv = $PythonCmd
    }
}

# Check Frontend node_modules
if (-not (Test-Path "$Root\frontend\node_modules")) {
    Write-Host "[First-Time Setup] Installing frontend npm packages..." -ForegroundColor Yellow
    Set-Location "$Root\frontend"
    cmd.exe /c npm install
    Set-Location $Root
}

Write-Host "Starting Backend (FastAPI)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd /d `"$Root\backend`" && `"$PyVenv`" -m uvicorn app.main:app --reload --port 8000"

Write-Host "Starting Frontend (React)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd /d `"$Root\frontend`" && cmd /c npm run dev"

Write-Host "Opening http://localhost:5173..." -ForegroundColor Green
Start-Sleep -Seconds 4
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "System launched! Check http://localhost:5173" -ForegroundColor Green

