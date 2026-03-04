#!/bin/bash
# Деплой на GitHub. Запускай в Git Bash (Пуск → Git → Git Bash), из папки qwen-landing-main.

set -e
cd "$(dirname "$0")"

echo "=== Проверка Git ==="
if ! command -v git &>/dev/null; then
  echo "Ошибка: git не найден. Установи Git или запусти этот скрипт из Git Bash."
  exit 1
fi
git --version

echo ""
echo "=== Статус репозитория ==="
if [ ! -d .git ]; then
  echo "Инициализация нового репозитория..."
  git init
  git add .
  git commit -m "Initial: паспорт продукта Полярная звезда + include/packaging"
  echo ""
  echo "Добавь удалённый репозиторий и запушь:"
  echo "  git remote add origin https://github.com/ТВОЙ_ЛОГИН/ИМЯ_РЕПО.git"
  echo "  git branch -M main"
  echo "  git push -u origin main"
  exit 0
fi

git status
echo ""
read -p "Добавить все изменения, закоммитить и отправить на GitHub? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Отменено."
  exit 0
fi

git add .
git status
echo ""
read -p "Введи сообщение коммита (или Enter для стандартного): " msg
if [ -z "$msg" ]; then
  msg="Update: паспорт Полярная звезда, include/packaging"
fi
git commit -m "$msg"

echo ""
echo "Отправка на origin..."
git push

echo ""
echo "Готово."
