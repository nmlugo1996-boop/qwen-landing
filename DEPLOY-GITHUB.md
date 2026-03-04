# Деплой на GitHub

Репозиторий уже инициализирован, первый коммит создан.

## Что сделать

### 1. Подключи свой репозиторий на GitHub

В терминале (в Cursor: **Terminal → New Terminal**) выполни из папки проекта:

```powershell
cd "c:\Users\Маша\Desktop\сайт\qwen-landing-main"
```

Добавь remote (подставь **свой** URL репозитория с GitHub):

```powershell
git remote add origin https://github.com/ТВОЙ_ЛОГИН/ИМЯ_РЕПОЗИТОРИЯ.git
```

Проверь:

```powershell
git remote -v
```

### 2. Отправь код на GitHub

```powershell
git branch -M main
git push -u origin main
```

При первом `push` может открыться окно входа в GitHub — войди в аккаунт.

---

**Если репозиторий на GitHub уже не пустой** (там есть старые коммиты), возможны два варианта:

- **Вариант A.** Сделать принудительную отправку (перезаписать историю на GitHub):
  ```powershell
  git push -u origin main --force
  ```

- **Вариант B.** Сначала подтянуть историю с GitHub и смержить:
  ```powershell
  git pull origin main --allow-unrelated-histories
  # Разреши конфликты, если появятся, затем:
  git push -u origin main
  ```

---

### 3. (По желанию) Своё имя и email в коммитах

Чтобы в истории были твои данные:

```powershell
git config --global user.email "твой@email.com"
git config --global user.name "Твоё Имя"
```

Текущий коммит уже создан с локальным `user@local`; новые коммиты будут с глобальными настройками.
