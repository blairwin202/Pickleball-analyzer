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
          contentType: file.type || "video/quicktime",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to prepare upload");
      }
      const { uploadUrl, analysisId, videoPath } = await res.json();
      console.log("Got upload URL, uploading to:", uploadUrl.substring(0, 80));
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.timeout = 300000;
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            console.log("Upload progress:", pct + "%");
            setState({ phase: "uploading", progress: pct });
          }
        });
        xhr.addEventListener("load", () => {
          console.log("XHR load, status:", xhr.status, xhr.responseText.substring(0, 100));
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error("Upload failed: " + xhr.status + " " + xhr.responseText.substring(0, 200)));
        });
        xhr.addEventListener("error", (e) => {
          console.log("XHR error:", e);
          reject(new Error("Network error during upload - check connection"));
        });
        xhr.addEventListener("timeout", () => reject(new Error("Upload timed out - try a shorter video")));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "video/quicktime");
        xhr.send(file);
      });
      console.log("Upload complete, triggering processing for:", analysisId);
      fetch("/api/videos/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, videoPath, playerPosition }),
      }).catch((e) => console.error("Process fetch error:", e));
      setState({ phase: "error", analysisId });
    } catch (err) {
      console.error("Upload error:", err);
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }, []);
  const reset = useCallback(() => setState({ phase: "idle" }), []);
  return { state, upload, reset };
}
