// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

async function triggerProcessingWithDelay(processorUrl, secret, analysisId, videoPath, userId, serviceClient) {
  await new Promise((r) => setTimeout(r, 5000));
  console.log("[fetch-url] Triggering Render for:", analysisId);
  try {
    const res = await fetch(processorUrl + "/process", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Secret": secret },
      body: JSON.stringify({ analysis_id: analysisId, video_storage_path: videoPath, user_id: userId }),
      signal: AbortSignal.timeout(10000),
    });
    console.log("[fetch-url] Render responded:", res.status);
    await serviceClient.from("analyses").update({ status: "processing", processing_started_at: new Date().toISOString() }).eq("id", analysisId);
  } catch (err) {
    console.error("[fetch-url] Render trigger failed:", err);
    await serviceClient.from("analyses").update({ status: "failed", error_message: "Processor unreachable" }).eq("id", analysisId);
  }
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await request.json();
  if (!url || typeof url !== "string") return NextResponse.json({ error: "A URL is required." }, { status: 400 });

  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { return NextResponse.json({ error: "Invalid URL provided." }, { status: 400 }); }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) return NextResponse.json({ error: "Only http and https URLs are supported." }, { status: 400 });

  let videoBuffer;
  let contentType = "video/mp4";
  try {
    const videoRes = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!videoRes.ok) return NextResponse.json({ error: "Could not fetch video from that URL. Make sure the link is publicly accessible." }, { status: 400 });
    const ct = videoRes.headers.get("content-type");
    if (ct) contentType = ct.split(";")[0].trim();
    const arrayBuf = await videoRes.arrayBuffer();
    videoBuffer = Buffer.from(arrayBuf);
  } catch (err) {
    return NextResponse.json({ error: "Failed to download video. The link may have expired or be restricted." }, { status: 400 });
  }

  if (videoBuffer.byteLength > 200 * 1024 * 1024) return NextResponse.json({ error: "Video exceeds 200MB limit." }, { status: 400 });

  const serviceClient = await createServiceClient();
  const { data: analysis, error: dbError } = await serviceClient
    .from("analyses")
    .insert({ user_id: user.id, video_path: "", video_size_bytes: videoBuffer.byteLength, status: "pending" })
    .select("id").single();
  if (dbError || !analysis) return NextResponse.json({ error: "Failed to create analysis record" }, { status: 500 });

  const rawName = parsedUrl.pathname.split("/").pop() || "video.mp4";
  const safeName = rawName.toLowerCase().replace(/[^a-z0-9._-]/g, "_");
  const videoPath = user.id + "/" + analysis.id + "/" + safeName;

  await serviceClient.from("analyses").update({ video_path: videoPath }).eq("id", analysis.id);

  const { error: uploadError } = await serviceClient.storage.from("videos").upload(videoPath, videoBuffer, { contentType, upsert: false });
  if (uploadError) { console.error("[fetch-url] Storage upload error:", uploadError); return NextResponse.json({ error: "Failed to store video." }, { status: 500 }); }

  const processorUrl = process.env.VIDEO_PROCESSOR_URL ?? "http://localhost:8000";
  const secret = process.env.VIDEO_PROCESSOR_SECRET ?? "";
  triggerProcessingWithDelay(processorUrl, secret, analysis.id, videoPath, user.id, serviceClient);

  return NextResponse.json({ analysisId: analysis.id, videoPath });
}
