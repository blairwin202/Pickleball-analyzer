// @ts-nocheck
"use client";
import { useCallback, useState } from "react";
import { UploadCloud, Video, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
const MAX_SIZE_MB = 200;
export function VideoDropzone({ onFile, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const validate = (file) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return "File must be under 200MB.";
    const isVideo = file.type.startsWith("video/") || file.type === "application/octet-stream" || file.name.match(/\.(mp4|mov|avi|mkv|webm|hevc|m4v|3gp|mts|m2ts)$/i);
    if (!isVideo) return "Please upload a video file (MP4, MOV, AVI, MKV, WebM and more).";
    return null;
  };
  const handle = useCallback((file) => {
    const err = validate(file);
    if (err) { setValidationError(err); return; }
    setValidationError(null);
    onFile(file);
  }, [onFile]);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 transition-colors",
        dragOver ? "border-green-500 bg-green-50" : "border-gray-300 bg-white hover:border-green-400 hover:bg-green-50/30",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <input
        type="file"
        accept="video/*,.mov,.avi,.mkv,.m4v,.3gp,.mts,.m2ts"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }}
        disabled={disabled}
      />
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        {dragOver ? <Video className="h-8 w-8 text-green-600" /> : <UploadCloud className="h-8 w-8 text-green-600" />}
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-800">
          {dragOver ? "Drop your video here" : "Upload your pickleball footage"}
        </p>
        <p className="mt-1 text-sm text-gray-500">Any video format - MP4, MOV, AVI, MKV and more - Max 200MB</p>
        <p className="mt-0.5 text-xs text-gray-400">Best results: 1-5 minute clips showing full rallies</p>
      </div>
      {validationError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {validationError}
        </div>
      )}
    </div>
  );
}
