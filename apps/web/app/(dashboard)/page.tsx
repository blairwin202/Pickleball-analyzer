"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { VideoDropzone } from "@/components/upload/VideoDropzone";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { useUpload } from "@/hooks/useUpload";

export default function HomePage() {
  const { state, upload, reset } = useUpload();
  const router = useRouter();

  useEffect(() => {
    if (state.phase === "done") {
      router.push(`/analysis/${state.analysisId}`);
    }
  }, [state, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analyze Your Game</h1>
        <p className="mt-1 text-gray-500">Upload a pickleball video to get AI-powered ratings and pro tips for all 4 players.</p>
      </div>

      {state.phase === "idle" && (
        <VideoDropzone onFile={(file) => upload(file, "all")} />
      )}

      {(state.phase === "uploading" || state.phase === "processing" || state.phase === "done") && (
        <UploadProgress
          phase={state.phase}
          progress={"progress" in state ? state.progress : undefined}
        />
      )}

      {state.phase === "error" && (
        <>
          <UploadProgress phase="error" message={state.message} />
          <button
            onClick={reset}
            className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}
