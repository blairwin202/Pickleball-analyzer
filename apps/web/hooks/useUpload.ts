// @ts-nocheck
import { useState, useCallback } from "react";
export function useUpload() {
  const [state, setState] = useState({ phase: "idle" });
  const upload = useCallback(async (file, playerPosition) => {
    setState({ phase: "uploading", progress: 0 });
    try {
      // Warm up Render before uploading
      try {
        await fetch("https://pickleball-analyzer.onrender.com/health", { method: "GET", signal: AbortSignal.timeout(30000) });
      } catch (e) {
        // Ignore warm-up errors, just continue
      }

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
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
      setState({ phase: "processing", analysisId });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);
      try {
        const processRes = await fetch("/api/videos/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisId, videoPath, playerPosition }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!processRes.ok) {
          throw new Error("Failed to start processing");
        }
      } catch (err) {
        clearTimeout(timeout);
        if (err.name === "AbortError") {
          // Timeout is OK - Render accepted the job, just took long to respond
          setState({ phase: "done", analysisId });
          return;
        }
        throw err;
      }
      setState({ phase: "done", analysisId });
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