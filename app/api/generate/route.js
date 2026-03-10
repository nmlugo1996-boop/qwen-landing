import { NextResponse } from "next/server";
import { createGenerationJob } from "../../../lib/generationJobs";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 }
      );
    }

    const job = await createGenerationJob(body);

    return NextResponse.json(
      {
        ok: true,
        jobId: job.id,
        status: job.status
      },
      {
        status: 202,
        headers: { "Cache-Control": "no-store, must-revalidate" }
      }
    );
  } catch (error) {
    console.error("Create generation job error", error);
    return NextResponse.json(
      { error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}