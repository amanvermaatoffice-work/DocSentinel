@echo off
if exist "%~dp0DocSentinel-main\run.bat" (
    cd /d "%~dp0DocSentinel-main"
    call run.bat
) else (
    echo [ERROR] DocSentinel-main subfolder not found in %~dp0
    pause
)
