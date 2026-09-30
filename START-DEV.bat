@echo off
cd /d "%~dp0"
if not exist .env (
  copy .env.example .env
  echo Hay dien ADMIN_PASSWORD trong .env va khoi tao MongoDB theo HUONG_DAN.md.
  pause
  exit /b 1
)
call npm run dev
pause
