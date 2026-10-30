@echo off
setlocal
cd /d "%~dp0"
if exist "dist\index.html" (
  start "" "dist\index.html"
) else (
  echo 未找到构建产物，正在启动开发服务器...
  start "" cmd /c "npm run dev -- --host 127.0.0.1 --port 4173"
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:4173/"
)
endlocal
