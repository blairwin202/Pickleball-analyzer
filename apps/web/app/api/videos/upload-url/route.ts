import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileName, fileSize, contentType } = await request.json();

  if (fileSize > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 200MB." },
      { status: 400 }
    );
  }

  if (!contentType.startsWith("video/")) {
    return NextResponse.json({ error: "Only video files are allowed." }, { status: 400 });
  }

  // Create analysis record first
  const serviceClient = await createServiceClient();
  const { data: analysis, error: dbError } = await serviceClient
    .from("analyses")
    .insert({
      user_id: user.id,
      video_path: "", // filled after upload
      video_size_bytes: fileSize,
      status: "pending",
    })
    .select("id")
    .single();

  if (dbError || !analysis) {
    return NextResponse.json({ error: "Failed to create analysis record" }, { status: 500 });
  }

  const videoPath = `${user.id}/${analysis.id}/${fileName}`;

  // Update analysis with video path
  await serviceClient
    .from("analyses")
    .update({ video_path: videoPath })
    .eq("id", analysis.id);

  // Generate signed upload URL (valid for 10 minutes)
  const { data: signedData, error: signedError } = await serviceClient.storage
    .from("videos")
    .createSignedUploadUrl(videoPath);

  if (signedError || !signedData) {
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }

  return NextResponse.json({
    uploadUrl: signedData.signedUrl,
    analysisId: analysis.id,
    videoPath,
  });
}
