$Root = $PSScriptRoot
if (Test-Path "$Root\DocSentinel-main\run.ps1") {
    Set-Location "$Root\DocSentinel-main"
    & "$Root\DocSentinel-main\run.ps1"
} else {
    Write-Host "[ERROR] DocSentinel-main subfolder not found in $Root" -ForegroundColor Red
    pause
}
