@echo off
cd /d "%~dp0"
set "MAIN_WEB=C:\Users\jadaojoao\Documents\analisys\apps\web"
set "NODE_PATH=%MAIN_WEB%\node_modules"
"%MAIN_WEB%\node_modules\.bin\next" dev --port 3002 --no-turbopack
