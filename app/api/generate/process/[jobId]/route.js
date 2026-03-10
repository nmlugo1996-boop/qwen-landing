import { NextResponse } from "next/server";
import generateModule from "../../../../../lib/generatePassport.js";
import {
  getGenerationJob,
  updateGenerationJob
} from "../../../../../lib/generationJobs";

export const runtime = "nodejs";
export const maxDuration = 300;

function resolveGenerateHelpers(mod) {
  if (!mod) return null;

  const root = mod.default && typeof mod.default === "function" ? mod : mod;

  return {
    normalizeInput:
      mod.normalizeInput ||
      mod.default?.normalizeInput ||
      null,
    normalizeInclude:
      mod.normalizeInclude ||
      mod.default?.normalizeInclude ||
      null,
    createConcept:
      mod.createConcept ||
      mod.default?.createConcept ||
      null,
    createPassport:
      mod.createPassport ||
      mod.default?.createPassport ||
      null,
    normalizeDraft:
      mod.normalizeDraft ||
      mod.default?.normalizeDraft ||
      null
  };
}

export async function POST(_request, { params }) {
  const jobId = params?.jobId;

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  try {
    const job = await getGenerationJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === "completed") {
      return NextResponse.json({
        ok: true,
        jobId: job.id,
        status: "completed",
        draft: job.draft_json
      });
    }

    if (job.status === "failed") {
      return NextResponse.json(
        {
          ok: false,
          jobId: job.id,
          status: "failed",
          error: job.error_text || "Generation failed"
        },
        { status: 500 }
      );
    }

    const helpers = resolveGenerateHelpers(generateModule);

    if (
      !helpers ||
      !helpers.normalizeInput ||
      !helpers.normalizeInclude ||
      !helpers.createConcept ||
      !helpers.createPassport ||
      !helpers.normalizeDraft
    ) {
      return NextResponse.json(
        {
          error:
            "generatePassport helpers not available. Проверь exports в lib/generatePassport.js"
        },
        { status: 500 }
      );
    }

    const payload = job.payload_json || {};
    const input = helpers.normalizeInput(payload);
    const include = helpers.normalizeInclude(payload);

    if (job.status === "queued" || job.status === "processing_concept") {
      await updateGenerationJob(jobId, {
        status: "processing_concept",
        started_at: job.started_at || new Date().toISOString(),
        error_text: null
      });

      const concept = await helpers.createConcept(input);

      await updateGenerationJob(jobId, {
        status: "processing_passport",
        concept_json: concept,
        error_text: null
      });

      return NextResponse.json({
        ok: true,
        jobId,
        status: "processing_passport"
      });
    }

    if (job.status === "processing_passport") {
      const concept = job.concept_json;

      if (!concept || typeof concept !== "object") {
        await updateGenerationJob(jobId, {
          status: "failed",
          error_text: "Concept is missing before passport step"
        });

        return NextResponse.json(
          { error: "Concept is missing before passport step" },
          { status: 500 }
        );
      }

      const rawDraft = await helpers.createPassport(input, include, concept);
      const draft = helpers.normalizeDraft(rawDraft, input, include, concept);

      await updateGenerationJob(jobId, {
        status: "completed",
        draft_json: draft,
        completed_at: new Date().toISOString(),
        error_text: null
      });

      return NextResponse.json({
        ok: true,
        jobId,
        status: "completed",
        draft
      });
    }

    return NextResponse.json({
      ok: true,
      jobId,
      status: job.status
    });
  } catch (error) {
    console.error("Process generation job error", error);

    try {
      await updateGenerationJob(jobId, {
        status: "failed",
        error_text: error?.message || "Internal processing error"
      });
    } catch (innerError) {
      console.error("Failed to persist job error", innerError);
    }

    return NextResponse.json(
      { error: error?.message || "Internal processing error" },
      { status: 500 }
    );
  }
}