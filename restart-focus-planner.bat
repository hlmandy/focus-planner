@echo off
setlocal

:: Kill existing dev and server processes on their ports
echo Stopping existing servers...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":5173 .*LISTENING"') do (
  taskkill /pid %%p /f >nul 2>nul
)
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":8787 .*LISTENING"') do (
  taskkill /pid %%p /f >nul 2>nul
)

cd /d "%~dp0focus-planner"
if errorlevel 1 (
  echo Could not enter focus-planner directory.
  pause
  exit /b 1
)

echo Starting Focus Planner...
start "Focus Planner Data Server" cmd /k "cd /d ""%CD%"" && npm run server"
start "Focus Planner Dev Server" cmd /k "cd /d ""%CD%"" && npm run dev"
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173/"

endlocal
