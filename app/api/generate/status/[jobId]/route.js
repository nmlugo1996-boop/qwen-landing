import { NextResponse } from "next/server";
import { getGenerationJob } from "../../../../../lib/generationJobs";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const jobId = params?.jobId;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const job = await getGenerationJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        ok: true,
        jobId: job.id,
        status: job.status,
        draft: job.draft_json || null,
        error: job.error_text || null
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, must-revalidate" }
      }
    );
  } catch (error) {
    console.error("Get generation status error", error);
    return NextResponse.json(
      { error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}