@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "GIT_EXE=D:\Program Files\Git\bin\git.exe"
if not exist "%GIT_EXE%" set "GIT_EXE=git"
set "PATH=D:\Program Files\Git\bin;%PATH%"

echo === Деплой на GitHub ===
echo.

"%GIT_EXE%" --version >nul 2>nul
if errorlevel 1 (
  echo Ошибка: git не найден. Проверь путь в deploy.bat: D:\Program Files\Git\bin
  pause
  exit /b 1
)

"%GIT_EXE%" --version
echo.

if not exist ".git" (
  echo Инициализация репозитория...
  "%GIT_EXE%" init
  "%GIT_EXE%" add .
  "%GIT_EXE%" commit -m "Initial: паспорт продукта Полярная звезда + include/packaging"
  echo.
  echo Добавь удалённый репозиторий и запушь вручную:
  echo   "%GIT_EXE%" remote add origin https://github.com/ТВОЙ_ЛОГИН/ИМЯ_РЕПО.git
  echo   "%GIT_EXE%" branch -M main
  echo   "%GIT_EXE%" push -u origin main
  pause
  exit /b 0
)

"%GIT_EXE%" status
echo.
set /p confirm="Добавить все изменения, закоммитить и отправить? (y/n): "
if /i not "%confirm%"=="y" (
  echo Отменено.
  pause
  exit /b 0
)

"%GIT_EXE%" add .
set /p msg="Сообщение коммита (Enter = стандартное): "
if "%msg%"=="" set msg=Update: паспорт Полярная звезда, include/packaging
"%GIT_EXE%" commit -m "%msg%"

echo.
echo Отправка на origin...
"%GIT_EXE%" push

echo.
echo Готово.
pause
