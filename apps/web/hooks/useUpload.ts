// @ts-nocheck
import { useState, useCallback } from "react";
export function useUpload() {
  const [state, setState] = useState({ phase: "idle" });
  const upload = useCallback(async (file, playerPosition) => {
    setState({ phase: "uploading", progress: 0 });
    try {
      const res = await fetch("/api/videos/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to prepare upload");
      }
      const { uploadUrl, analysisId, videoPath } = await res.json();
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.timeout = 300000;
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setState({ phase: "uploading", progress: Math.round((e.loaded / e.total) * 100) });
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error("Upload failed: " + xhr.status));
        });
        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
        xhr.addEventListener("timeout", () => reject(new Error("Upload timed out - try a shorter video")));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
      // Trigger processing - fire and forget, do not await
      fetch("/api/videos/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, videoPath, playerPosition }),
      }).catch((e) => console.error("Process fetch error:", e));
      // Set done immediately so mobile does not need to stay connected
      setState({ phase: "error", analysisId });
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }, []);
  const reset = useCallback(() => setState({ phase: "idle" }), []);
  return { state, upload, reset };
}
