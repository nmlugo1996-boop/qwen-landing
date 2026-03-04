@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo === Деплой на GitHub ===
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo Ошибка: git не найден в PATH.
  echo Запусти этот файл из "Git Bash" ^(Пуск - Git - Git Bash^) или перезапусти Cursor после установки Git.
  pause
  exit /b 1
)

git --version
echo.

if not exist ".git" (
  echo Инициализация репозитория...
  git init
  git add .
  git commit -m "Initial: паспорт продукта Полярная звезда + include/packaging"
  echo.
  echo Добавь удалённый репозиторий и запушь вручную:
  echo   git remote add origin https://github.com/ТВОЙ_ЛОГИН/ИМЯ_РЕПО.git
  echo   git branch -M main
  echo   git push -u origin main
  pause
  exit /b 0
)

git status
echo.
set /p confirm="Добавить все изменения, закоммитить и отправить? (y/n): "
if /i not "%confirm%"=="y" (
  echo Отменено.
  pause
  exit /b 0
)

git add .
set /p msg="Сообщение коммита (Enter = стандартное): "
if "%msg%"=="" set msg=Update: паспорт Полярная звезда, include/packaging
git commit -m "%msg%"

echo.
echo Отправка на origin...
git push

echo.
echo Готово.
pause
