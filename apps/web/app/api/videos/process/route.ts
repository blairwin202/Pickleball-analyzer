import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { analysisId, videoPath } = await request.json();
  console.log("[process] Starting for analysisId:", analysisId);

  const serviceClient = await createServiceClient();

  const { data: analysis } = await serviceClient
    .from("analyses")
    .select("id, user_id")
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .single();

  if (!analysis) {
    console.log("[process] Analysis not found:", analysisId);
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  await serviceClient
    .from("analyses")
    .update({ status: "processing", processing_started_at: new Date().toISOString() })
    .eq("id", analysisId);

  const processorUrl = process.env.VIDEO_PROCESSOR_URL ?? "http://localhost:8000";
  const secret = process.env.VIDEO_PROCESSOR_SECRET ?? "";
  console.log("[process] Calling Render at:", processorUrl);

  try {
    const renderRes = await fetch(processorUrl + "/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Secret": secret,
      },
      body: JSON.stringify({
        analysis_id: analysisId,
        video_storage_path: videoPath,
        user_id: user.id,
      }),
      signal: AbortSignal.timeout(8000),
    });
    console.log("[process] Render responded:", renderRes.status);
  } catch (err) {
    console.error("[process] Render call failed:", err);
    await serviceClient
      .from("analyses")
      .update({ status: "failed", error_message: "Processor unreachable - please try again" })
      .eq("id", analysisId);
  }

  return NextResponse.json({ analysisId, status: "processing" });
}
