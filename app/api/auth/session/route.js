import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "../../../../lib/supabaseClient";
import { getUserById } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      return NextResponse.json({ session: null });
    }

    const profile = await getUserById(user.id);

    return NextResponse.json({
      session: {
        id: user.id,
        email: user.email,
        tg_id: profile?.tg_id ?? null
      }
    });
  } catch (error) {
    console.error("session route error", error);
    return NextResponse.json({ session: null, error: error.message }, { status: 500 });
  }
}

