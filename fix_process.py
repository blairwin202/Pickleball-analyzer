path = r"C:\Users\blair\Documents\pickleball-analyzer\apps\web\app\api\videos\process\route.ts"
content = '''import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

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

  // Return immediately to the client so mobile browser can close
  const response = NextResponse.json({ analysisId, status: "processing" });

  // Trigger Render after response is sent using waitUntil pattern
  try {
    await fetch(${processorUrl}/process, {
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
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error("Processor trigger failed for " + analysisId + ":", err);
    // Mark as failed so user knows to retry
    await serviceClient
      .from("analyses")
      .update({ status: "failed", error_message: "Processor unreachable - please try again" })
      .eq("id", analysisId);
  }

  return response;
}
'''
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done!")