// lib/db.ts

/**
 * ⚠️ ВНИМАНИЕ: Supabase отключен.
 * Все функции возвращают заглушки для совместимости.
 * Генерация паспортов работает без базы данных.
 */

export async function getServerSession() {
  // Возвращаем null (пользователь не авторизован)
  return null;
}

export async function ensureUser(email: string) {
  // Возвращаем null (пользователь не создается)
  return null;
}

export async function listProjects(userId: string) {
  // Возвращаем пустой массив (проектов нет)
  return [];
}

export async function createProject(
  userId: string,
  payload: { title: string; category?: string }
) {
  // Возвращаем ошибку (проекты не создаются)
  throw new Error(
    "База данных не подключена. Функция createProject недоступна."
  );
}

export async function getProjectById(projectId: string) {
  // Возвращаем null (проект не найден)
  return null;
}

export async function insertDraft({
  projectId,
  data,
  model
}: {
  projectId: string;
  data: unknown;
  model?: string | null;
}) {
  // Возвращаем null (черновик не сохраняется)
  return null;
}

export async function upsertUserTelegram(userId: string, tgId: string) {
  // Ничего не делаем (Telegram не подключен)
}

export async function getUserById(userId: string) {
  // Возвращаем null (пользователь не найден)
  return null;
}