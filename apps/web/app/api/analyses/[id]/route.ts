import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: analysis, error } = await supabase
    .from("analyses")
    .select(`
      id, status, error_message, rating, rating_confidence,
      component_scores, shot_analysis, footwork_analysis, positioning_analysis, strengths, weaknesses, player_results, created_at,
      tips (id, title, category, priority, tip_text, drill_text)
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  return NextResponse.json(analysis);
}
