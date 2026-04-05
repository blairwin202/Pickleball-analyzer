// @ts-nocheck
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { VideoDropzone } from "@/components/upload/VideoDropzone";
import { VideoRecorder } from "@/components/upload/VideoRecorder";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { useUpload } from "@/hooks/useUpload";

export default function HomePage() {
  const { state, upload, reset } = useUpload();
  const router = useRouter();
  const [mode, setMode] = useState<"choose"|"record"|"upload">("choose");

  useEffect(() => {
    if (state.phase === "done") {
      router.push("/analysis/" + ("analysisId" in state ? state.analysisId : ""));
    }
  }, [state, router]);

  const handleFile = (file: File) => upload(file, "all");

  const isActive = state.phase !== "idle" && state.phase !== "error";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analyze Your Game</h1>
        <p className="mt-1 text-gray-500">Record or upload a pickleball video to get AI-powered ratings and pro tips for all 4 players.</p>
      </div>

      {!isActive && mode === "choose" && (
        <div className="space-y-3">
          <button onClick={() => setMode("record")}
            className="w-full rounded-2xl bg-green-600 p-5 text-left hover:bg-green-700 transition-colors">
            <p className="text-white font-bold text-lg">Record at the Court</p>
            <p className="text-green-100 text-sm mt-0.5">Use your camera directly in the app</p>
          </button>
          <button onClick={() => setMode("upload")}
            className="w-full rounded-2xl border-2 border-dashed border-gray-300 p-5 text-left hover:border-green-400 hover:bg-green-50/30 transition-colors">
            <p className="text-gray-800 font-bold text-lg">Upload Existing Video</p>
            <p className="text-gray-500 text-sm mt-0.5">MP4 or WebM, max 200MB</p>
          </button>
        </div>
      )}

      {!isActive && mode === "record" && (
        <div className="space-y-3">
          <button onClick={() => setMode("choose")} className="text-sm text-gray-500 hover:text-gray-700">
            Back
          </button>
          <VideoRecorder onFile={handleFile} disabled={isActive} />
        </div>
      )}

      {!isActive && mode === "upload" && (
        <div className="space-y-3">
          <button onClick={() => setMode("choose")} className="text-sm text-gray-500 hover:text-gray-700">
            Back
          </button>
          <VideoDropzone onFile={handleFile} disabled={isActive} />
        </div>
      )}

      {(state.phase === "uploading" || state.phase === "processing" || state.phase === "done") && (
        <UploadProgress phase={state.phase} progress={"progress" in state ? state.progress : undefined} />
      )}

      {state.phase === "error" && (
        <>
          <UploadProgress phase="error" message={state.message} />
          <button onClick={() => { reset(); setMode("choose"); }}
            className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Try again
          </button>
        </>
      )}
    </div>
  );
}
