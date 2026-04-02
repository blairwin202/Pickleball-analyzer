import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: analyses, error } = await supabase
    .from("analyses")
    .select("id, status, rating, rating_confidence, created_at, error_message, player_results")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch analyses" }, { status: 500 });
  }

  return NextResponse.json(analyses ?? []);
}
