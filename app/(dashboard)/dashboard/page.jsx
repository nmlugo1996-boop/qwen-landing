import Link from "next/link";

export default async function DashboardPage() {
  // ВРЕМЕННАЯ ЗАГЛУШКА — Supabase отключен
  return (
    <section style={{ display: "grid", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Ваши проекты</h1>
          <p className="muted" style={{ margin: "8px 0 0" }}>
            Количество проектов: 0
          </p>
        </div>
        <Link href="/" className="btn">
          Создать проект
        </Link>
      </div>

      <div style={{ display: "grid", gap: "18px" }}>
        <p className="muted">
          Личный кабинет временно отключен. 
          <br />
          Перейдите на главную страницу для генерации паспорта.
        </p>
        <Link href="/" className="btn secondary">
          На главную
        </Link>
      </div>
    </section>
  );
}