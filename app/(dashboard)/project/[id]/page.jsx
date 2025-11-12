import { notFound } from "next/navigation";
import { getProjectById } from "../../../../lib/db";
import HomeClient from "../../../../components/HomeClient";

export default async function ProjectPage({ params, searchParams }) {
  const project = await getProjectById(params.id);
  if (!project) {
    notFound();
  }

  const drafts = Array.isArray(project.drafts) ? project.drafts : [];
  const latestDraft = drafts.length ? drafts[drafts.length - 1].data_json : null;
  const autoDownload = searchParams?.download === "docx";

  return (
    <section style={{ display: "grid", gap: "24px" }}>
      <div>
        <h1 style={{ margin: 0 }}>{project.title || "Проект без названия"}</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Категория: {project.category || "—"} · Черновиков: {drafts.length}
        </p>
      </div>
      <HomeClient initialDraft={latestDraft} projectId={project.id} autoDownloadDocx={autoDownload} />
    </section>
  );
}

