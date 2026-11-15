@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Sign-Upload.ps1"
if errorlevel 1 echo Proses belum selesai. Lihat pesan di atas.
pause
