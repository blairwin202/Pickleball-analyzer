"use client";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
interface Props {
  phase: "uploading" | "processing" | "done" | "error";
  progress?: number;
  message?: string;
  isUrlMode?: boolean;
}
const STEPS = [
  { key: "uploading", label: "Uploading video" },
  { key: "processing", label: "Analyzing footage" },
  { key: "done", label: "Analysis complete" },
];
export function UploadProgress({ phase, progress = 0, message, isUrlMode = false }: Props) {
  const currentStep = STEPS.findIndex((s) => s.key === phase);
  const uploadLabel = isUrlMode
    ? "Fetching your video..."
    : "Uploading video -- " + progress + "%";
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-10 shadow-sm">
      {phase === "error" ? (
        <>
          <AlertCircle className="h-12 w-12 text-yellow-500" />
          <div className="text-center">
            <p className="font-semibold text-gray-800">Video uploaded!</p>
            <p className="mt-1 text-sm text-gray-500">Your video is being analyzed. Check your History in 2-3 minutes to see your results.</p>
          </div>
        </>
      ) : (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-green-500" />
          <div className="w-full max-w-sm space-y-3">
            {STEPS.map((step, i) => {
              const done = i < currentStep || phase === "done";
              const active = i === currentStep && phase !== "done";
              return (
                <div key={step.key} className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                  ) : active ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-green-500" />
                  ) : (
                    <div className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={active || done ? "text-sm font-medium text-gray-800" : "text-sm text-gray-400"}>
                    {active && step.key === "uploading" ? uploadLabel : step.label}
                    {active && step.key === "processing" && " (5-7 min)"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}