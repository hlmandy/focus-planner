@echo off
setlocal

cd /d "%~dp0focus-planner"
if errorlevel 1 (
  echo Could not enter focus-planner directory.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js first:
  echo https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please reinstall Node.js or add npm to PATH.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting Focus Planner...
echo Starting local data server on http://localhost:8787/
start "Focus Planner Data Server" cmd /k "cd /d ""%CD%"" && npm run server"

echo The app will usually open at http://localhost:5173/
start "Focus Planner Dev Server" cmd /k "cd /d ""%CD%"" && npm run dev"
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173/"

endlocal
