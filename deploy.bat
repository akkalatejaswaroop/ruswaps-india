@echo off
REM Ruswaps Web - Deployment Script for Windows
REM Run this script to deploy the application

echo ============================================
echo   Ruswaps Web - Deployment Script
echo ============================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo Node.js found:
node --version
echo.

REM Install dependencies
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

REM Generate Prisma Client
echo Generating Prisma Client...
call npx prisma generate
echo.

REM Build the application
echo Building the application...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo.

echo ============================================
echo   Build completed successfully!
echo ============================================
echo.
echo To start the production server, run:
echo   npm start
echo.
echo Or to start the development server, run:
echo   npm run dev
echo.
pause
