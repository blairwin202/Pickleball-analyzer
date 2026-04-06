// @ts-nocheck
import { useState, useCallback } from "react";

export function useUpload() {
  const [state, setState] = useState({ phase: "idle" });

  const upload = useCallback(async (file, playerPosition, url) => {
    setState({ phase: "uploading", progress: url ? null : 0 });
    try {
      if (url) {
        const res = await fetch("/api/videos/fetch-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to fetch video from URL");
        }
        const { analysisId, videoPath } = await res.json();
        fetch("/api/videos/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisId, videoPath, playerPosition }),
        }).catch((e) => console.error("Process fetch error:", e));
        setState({ phase: "done", analysisId });
      } else {
        // Step 1: get signed upload URL
        const res = await fetch("/api/videos/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            contentType: "video/mp4",
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to prepare upload");
        }
        const { uploadUrl, analysisId, videoPath } = await res.json();

        // Step 2: XHR direct to Supabase with progress tracking
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.timeout = 600000;
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setState({ phase: "uploading", progress: Math.round((e.loaded / e.total) * 100) });
            }
          });
          xhr.addEventListener("load", () => {
            console.log("[upload] XHR status:", xhr.status, xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error("Upload failed: " + xhr.status + " " + xhr.responseText));
          });
          xhr.addEventListener("error", (e) => {
            console.error("[upload] XHR error:", e);
            reject(new Error("Network error during upload - check connection and try again"));
          });
          xhr.addEventListener("timeout", () => {
            reject(new Error("Upload timed out - try a shorter video"));
          });
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", "video/mp4");
          xhr.send(file);
        });

        // Step 3: trigger processing
        fetch("/api/videos/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisId, videoPath, playerPosition }),
        }).catch((e) => console.error("Process fetch error:", e));

        setState({ phase: "done", analysisId });
      }
    } catch (err) {
      console.error("[upload] Error:", err);
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }, []);

  const reset = useCallback(() => setState({ phase: "idle" }), []);
  return { state, upload, reset };
}
