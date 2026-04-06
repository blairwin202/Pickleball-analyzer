// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

async function triggerProcessingWithDelay(processorUrl, secret, analysisId, videoPath, userId, serviceClient) {
  await new Promise((r) => setTimeout(r, 5000));
  console.log("[upload-file] Triggering Render for:", analysisId);
  try {
    const res = await fetch(processorUrl + "/process", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Secret": secret },
      body: JSON.stringify({ analysis_id: analysisId, video_storage_path: videoPath, user_id: userId }),
      signal: AbortSignal.timeout(10000),
    });
    console.log("[upload-file] Render responded:", res.status);
    await serviceClient.from("analyses").update({ status: "processing", processing_started_at: new Date().toISOString() }).eq("id", analysisId);
  } catch (err) {
    console.error("[upload-file] Render trigger failed:", err);
    await serviceClient.from("analyses").update({ status: "failed", error_message: "Processor unreachable" }).eq("id", analysisId);
  }
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData;
  try {
    formData = await request.formData();
  } catch (err) {
    return NextResponse.json({ error: "Failed to parse upload" }, { status: 400 });
  }

  const file = formData.get("file");
  const playerPosition = formData.get("playerPosition") || "all";

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const MAX_SIZE = 200 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 200MB." }, { status: 400 });
  }

  const serviceClient = await createServiceClient();

  // Create analysis record
  const { data: analysis, error: dbError } = await serviceClient
    .from("analyses")
    .insert({ user_id: user.id, video_path: "", video_size_bytes: file.size, status: "pending" })
    .select("id")
    .single();
  if (dbError || !analysis) {
    return NextResponse.json({ error: "Failed to create analysis record" }, { status: 500 });
  }

  // Build storage path - always store as .mp4 since backend converts anyway
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/\.[^.]+$/, ".mp4");
  const videoPath = user.id + "/" + analysis.id + "/" + safeName;

  await serviceClient.from("analyses").update({ video_path: videoPath }).eq("id", analysis.id);

  // Read file as buffer and upload to Supabase
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  console.log("[upload-file] Uploading", file.name, "size:", buffer.byteLength, "to:", videoPath);

  const { error: uploadError } = await serviceClient.storage
    .from("videos")
    .upload(videoPath, buffer, { contentType: "video/mp4", upsert: false });

  if (uploadError) {
    console.error("[upload-file] Storage error:", uploadError);
    return NextResponse.json({ error: "Failed to store video: " + uploadError.message }, { status: 500 });
  }

  console.log("[upload-file] Upload successful for:", analysis.id);

  const processorUrl = process.env.VIDEO_PROCESSOR_URL ?? "http://localhost:8000";
  const secret = process.env.VIDEO_PROCESSOR_SECRET ?? "";
  triggerProcessingWithDelay(processorUrl, secret, analysis.id, videoPath, user.id, serviceClient);

  return NextResponse.json({ analysisId: analysis.id, videoPath });
}
