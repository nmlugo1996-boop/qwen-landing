import { NextResponse } from "next/server";
import generateModule from "../../../lib/generatePassport.js";

export const runtime = "nodejs";

function resolveRunGenerate(mod) {
  if (!mod) return null;

  if (typeof mod === "function") return mod;

  if (typeof mod.runGenerate === "function") {
    return mod.runGenerate.bind(mod);
  }

  if (mod.default) {
    if (typeof mod.default === "function") {
      return mod.default;
    }
    if (typeof mod.default.runGenerate === "function") {
      return mod.default.runGenerate.bind(mod.default);
    }
  }

  return null;
}

export async function POST(request) {
  try {
    const runGenerate = resolveRunGenerate(generateModule);

    if (!runGenerate) {
      console.error(
        "Generate API: runGenerate not found on imported module",
        Object.keys(generateModule || {})
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