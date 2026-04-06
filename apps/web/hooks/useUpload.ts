// @ts-nocheck
import { useState, useCallback } from "react";

export function useUpload() {
  const [state, setState] = useState({ phase: "idle" });

  const upload = useCallback(async (file, playerPosition, url) => {
    setState({ phase: "uploading", progress: null });
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
        // Use FormData to upload file through our own API route
        // This is more reliable on mobile than XHR directly to Supabase
        const formData = new FormData();
        formData.append("file", file);
        if (playerPosition) formData.append("playerPosition", playerPosition);

        const res = await fetch("/api/videos/upload-file", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Upload failed");
        }
        const { analysisId } = await res.json();
        setState({ phase: "done", analysisId });
      }
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : "Upload failed" });
    }
  }, []);

  const reset = useCallback(() => setState({ phase: "idle" }), []);
  return { state, upload, reset };
}
