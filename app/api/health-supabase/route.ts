import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET() {
  const url   = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const srole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  const env = { url: !!url, anon: !!anon, srole: !!srole };

  if (!env.url || (!env.anon && !env.srole)) {
    return NextResponse.json({
      ok: true,
      mode: "noop",
      env,
      note: "Supabase credentials are not configured, skipping connectivity check.",
      build: (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7)
    });
  }

  let db = false, error: any = null, mode: "service" | "anon" | null = null;

  try {
    if (srole) {
      const admin = createClient(url, srole, { auth: { persistSession: false } });
      const { error: e1 } = await admin.from("_health").select("id", { head: true, count: "exact" }).limit(1);
      if (!e1) {
        db = true;
        mode = "service";
      } else {
        error = e1;
      }
    }

    if (!db && anon) {
      const pub = createClient(url, anon, { auth: { persistSession: false } });
      const { error: e2 } = await pub.from("_health").select("id", { head: true, count: "exact" }).limit(1);
      if (!e2) {
        db = true;
        mode = "anon";
      } else {
        error = error ?? e2;
      }
    }
  } catch (e: any) {
    error = e?.message ?? String(e);
  }

  const errMsg = error
    ? typeof error === "string"
      ? error
      : error.message || JSON.stringify(error)
    : null;

  return NextResponse.json({
    ok: db,
    mode,
    env,
    error: errMsg,
    build: (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7)
  });
}

