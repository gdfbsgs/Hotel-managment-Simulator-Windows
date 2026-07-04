@echo off
title ArchHotel Simulator - Windows Edition
cd /d "%~dp0"

echo.
echo  ============================================
echo   ArchHotel 3D Tycoon - Windows Edition
echo  ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  [ERROR] Node.js is not installed.
  echo.
  echo  Download and install Node.js LTS from:
  echo  https://nodejs.org/
  echo.
  pause
  exit /b 1
)

for /f "tokens=1 delims=v" %%i in ('node -v') do set NODE_MAJOR=%%i
set NODE_MAJOR=%NODE_MAJOR:v=%
for /f "tokens=1 delims=." %%i in ("%NODE_MAJOR%") do set NODE_MAJOR=%%i
if %NODE_MAJOR% LSS 18 (
  echo  [ERROR] Node.js 18 or newer is required. You have:
  node -v
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo  Installing dependencies (first run only)...
  echo.
  call npm install
  if %errorlevel% neq 0 (
    echo  [ERROR] npm install failed.
    pause
    exit /b 1
  )
  echo.
)

if not exist ".env.local" (
  copy ".env.example" ".env.local" >nul
  echo  Created .env.local - add GEMINI_API_KEY for AI features.
  echo  Presets and gameplay work without an API key.
  echo.
)

echo  Starting server at http://localhost:3000
echo  Press Ctrl+C to stop.
echo.

call npm run dev

if %errorlevel% neq 0 (
  echo.
  echo  [ERROR] Server exited with an error.
  pause
)
