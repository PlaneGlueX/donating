@echo off
rem Donating: the local playtest launcher (tools\playtest.ps1). Double-click it for the menu, or give an action:
rem   play, start [1G or 2G], stop, restart, status, pack, log, cmd "<console command>", launcher
title Donating playtest
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\playtest.ps1" %*
set "rc=%errorlevel%"
rem Started by a double-click: keep the window open when something failed, so the message can be read.
if "%~1"=="" if not "%rc%"=="0" pause
exit /b %rc%
