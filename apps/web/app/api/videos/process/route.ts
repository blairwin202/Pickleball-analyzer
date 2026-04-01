import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { analysisId, videoPath } = await request.json();
  const serviceClient = await createServiceClient();
  const { data: analysis } = await serviceClient
    .from("analyses")
    .select("id, user_id")
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .single();
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }
  await serviceClient
    .from("analyses")
    .update({ status: "processing", processing_started_at: new Date().toISOString() })
    .eq("id", analysisId);
  const processorUrl = process.env.VIDEO_PROCESSOR_URL ?? "http://localhost:8000";
  // Warm up Render first
  try {
    await fetch(processorUrl, { method: "GET", signal: AbortSignal.timeout(8000) });
  } catch (e) {
    // Ignore - just waking up
  }
  // Now fire the process request
  fetch(`${processorUrl}/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Secret": process.env.VIDEO_PROCESSOR_SECRET ?? "",
    },
    body: JSON.stringify({
      analysis_id: analysisId,
      video_storage_path: videoPath,
      user_id: user.id,
    }),
  }).catch(() => {
    console.error("Failed to reach video processor for analysis " + analysisId);
  });
  return NextResponse.json({ analysisId, status: "processing" });
}