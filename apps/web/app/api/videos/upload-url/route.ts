import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
const MAX_SIZE_BYTES = 200 * 1024 * 1024;

async function triggerProcessingWithDelay(processorUrl: string, secret: string, analysisId: string, videoPath: string, userId: string, serviceClient: any) {
  // Wait 30 seconds for the upload to complete before triggering
  await new Promise(r => setTimeout(r, 30000));
  console.log("[upload-url] Triggering Render for:", analysisId);
  try {
    const res = await fetch(processorUrl + "/process", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Secret": secret },
      body: JSON.stringify({ analysis_id: analysisId, video_storage_path: videoPath, user_id: userId }),
      signal: AbortSignal.timeout(10000),
    });
    console.log("[upload-url] Render responded:", res.status);
    await serviceClient.from("analyses").update({ status: "processing", processing_started_at: new Date().toISOString() }).eq("id", analysisId);
  } catch (err) {
    console.error("[upload-url] Render trigger failed:", err);
    await serviceClient.from("analyses").update({ status: "failed", error_message: "Processor unreachable" }).eq("id", analysisId);
  }
}

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { fileName, fileSize, contentType } = await request.json();
  if (fileSize > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum size is 200MB." }, { status: 400 });
  }
  const allowedTypes = ["video/", "image/jpeg", "image/png", "application/octet-stream"];
  const isAllowed = allowedTypes.some(t => contentType.startsWith(t)) || !contentType;
  if (!isAllowed) {
    return NextResponse.json({ error: "Only video files are allowed." }, { status: 400 });
  }
  const serviceClient = await createServiceClient();
  const { data: analysis, error: dbError } = await serviceClient
    .from("analyses")
    .insert({ user_id: user.id, video_path: "", video_size_bytes: fileSize, status: "pending" })
    .select("id")
    .single();
  if (dbError || !analysis) {
    return NextResponse.json({ error: "Failed to create analysis record" }, { status: 500 });
  }
  const videoPath = user.id + "/" + analysis.id + "/" + fileName;
  await serviceClient.from("analyses").update({ video_path: videoPath }).eq("id", analysis.id);
  const { data: signedData, error: signedError } = await serviceClient.storage
    .from("videos")
    .createSignedUploadUrl(videoPath);
  if (signedError || !signedData) {
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }
  const processorUrl = process.env.VIDEO_PROCESSOR_URL ?? "http://localhost:8000";
  const secret = process.env.VIDEO_PROCESSOR_SECRET ?? "";
  // Fire delayed trigger - no await, runs in background
  triggerProcessingWithDelay(processorUrl, secret, analysis.id, videoPath, user.id, serviceClient);
  return NextResponse.json({ uploadUrl: signedData.signedUrl, analysisId: analysis.id, videoPath });
}
