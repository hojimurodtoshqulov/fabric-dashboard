@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-schedule.ps1" %*
pause
