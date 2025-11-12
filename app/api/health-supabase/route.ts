import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const hasUrl = Boolean(url);
  const hasAnon = Boolean(anon);
  const hasService = Boolean(service);

  let errorMessage: string | null = null;

  if (hasUrl && hasAnon) {
    try {
      const supabase = createClient(url!, anon!);
      const { error } = await supabase.rpc("health_ping");

      if (error) {
        console.error("[health-supabase] Supabase ping error:", error);
        errorMessage = error.message ?? "Unknown Supabase error";
      }
    } catch (error) {
      console.error("[health-supabase] Unexpected error:", error);
      errorMessage = error instanceof Error ? error.message : "Unknown error";
    }
  } else {
    errorMessage = "Missing Supabase environment variables";
  }

  return Response.json({
    ok: !errorMessage,
    hasUrl,
    hasAnon,
    hasService,
    error: errorMessage
  });
}

