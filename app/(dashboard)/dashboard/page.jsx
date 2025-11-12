import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "../../../lib/supabaseClient";
import { listProjects } from "../../../lib/db";
import dynamic from "next/dynamic";

const SendToTelegramButton = dynamic(() => import("../../../components/SendToTelegramButton"), { ssr: false });

async function getData() {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { session: null, projects: [] };
  const projects = await listProjects(auth.user.id);
  return { session: auth.user, projects };
}

export default async function DashboardPage() {
  const { session, projects } = await getData();

  if (!session) {
    return (
      <section style={{ display: "grid", gap: "18px" }}>
        <h1>Личный кабинет</h1>
        <p>Чтобы увидеть проекты, войдите по magic link (кнопка в шапке).</p>
        <Link href="/" className="btn ghost" style={{ width: "fit-content" }}>
          На главную
        </Link>
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Ваши проекты</h1>
          <p className="muted" style={{ margin: "8px 0 0" }}>
            Количество проектов: {projects.length}
          </p>
        </div>
        <Link href="/" className="btn">
          Создать проект
        </Link>
      </div>

      <div style={{ display: "grid", gap: "18px" }}>
        {projects.length === 0 && <p className="muted">Проектов пока нет. Создайте новый на главной странице.</p>}
        {projects.map((project) => (
          <div key={project.id} className="card" style={{ opacity: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0 }}>{project.title || "Без названия"}</h2>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  Категория: {project.category || "—"} · Черновиков: {project.drafts?.length || 0}
                </p>
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <Link href={`/project/${project.id}`} className="btn secondary">
                  Открыть
                </Link>
                <SendToTelegramButton projectId={project.id} />
                <Link href={`/project/${project.id}?download=docx`} className="btn ghost">
                  Скачать DOCX
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

