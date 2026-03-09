import { NextResponse } from "next/server";
import generateApi from "../../../api/generate.js";

export const runtime = "nodejs";

function resolveRunGenerate(moduleImported) {
  if (!moduleImported) return null;

  if (typeof moduleImported === "function") return moduleImported;

  if (typeof moduleImported.runGenerate === "function") {
    return moduleImported.runGenerate.bind(moduleImported);
  }

  if (moduleImported.default) {
    if (typeof moduleImported.default === "function") {
      return moduleImported.default;
    }
    if (typeof moduleImported.default.runGenerate === "function") {
      return moduleImported.default.runGenerate.bind(moduleImported.default);
    }
  }

  return null;
}

export async function POST(request) {
  try {
    const runGenerate = resolveRunGenerate(generateApi);

    if (!runGenerate) {
      console.error(
        "Generate API: runGenerate not found on imported module",
        Object.keys(generateApi || {})
      );
      return NextResponse.json(
        { error: "runGenerate not available on generate module" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const draft = await runGenerate(body);
    return NextResponse.json(draft);
  } catch (error) {
    console.error("Generate passport API error", error);
    return NextResponse.json(
      { error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}