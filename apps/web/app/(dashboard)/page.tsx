// @ts-nocheck
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { VideoDropzone } from "@/components/upload/VideoDropzone";
import { VideoRecorder } from "@/components/upload/VideoRecorder";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { useUpload } from "@/hooks/useUpload";
import { Link, Upload, Video } from "lucide-react";
const TABS = [
  { id: "record", label: "Record" },
  { id: "file",   label: "Upload" },
  { id: "link",   label: "Paste Link" },
];
export default function HomePage() {
  const { state, upload, reset } = useUpload();
  const router = useRouter();
  const [tab, setTab] = useState("record");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  useEffect(() => {
    if (state.phase === "done") {
      router.push(`/analysis/${"analysisId" in state ? state.analysisId : ""}`);
    }
  }, [state, router]);
  function handleAnalyzeLink() {
    setLinkError("");
    const trimmed = linkUrl.trim();
    if (!trimmed) { setLinkError("Please paste a video link first."); return; }
    try { new URL(trimmed); } catch { setLinkError("That doesn't look like a valid URL. Make sure it starts with https://"); return; }
    upload(null, "all", trimmed);
  }
  const isLoading = state.phase === "uploading" || state.phase === "processing" || state.phase === "done";
  const TabIcon = ({ id }) => {
    if (id === "record") return <Video className="h-4 w-4" />;
    if (id === "file")   return <Upload className="h-4 w-4" />;
    return <Link className="h-4 w-4" />;
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analyze Your Game</h1>
        <p className="mt-1 text-gray-500">Get AI-powered ratings and pro tips for all 4 players.</p>
      </div>
      {!isLoading && state.phase !== "error" && (
        <>
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
            {TABS.map((t) => (
              <button key={t.id}
                onClick={() => { setTab(t.id); setLinkError(""); }}
                className={["flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-colors",
                  tab === t.id ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"].join(" ")}
              >
                <TabIcon id={t.id} />
                {t.label}
              </button>
            ))}
          </div>
          {tab === "record" && <VideoRecorder onFile={(file) => upload(file, "all")} />}
          {tab === "file" && <VideoDropzone onFile={(file) => upload(file, "all")} />}
          {tab === "link" && (
            <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-10 space-y-5">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Link className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-gray-800">Paste your video link</p>
                <p className="text-sm text-gray-500">Works with Save My Play share links, Google Drive, Dropbox, or any direct video URL.</p>
              </div>
              <div className="space-y-3">
                <input type="url" value={linkUrl}
                  onChange={(e) => { setLinkUrl(e.target.value); setLinkError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAnalyzeLink(); }}
                  placeholder="https://savemyplay.com/share/..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                {linkError && <p className="text-sm text-red-600">{linkError}</p>}
                <button onClick={handleAnalyzeLink}
                  className="w-full rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 active:scale-[0.98] transition-all">
                  Analyze this video
                </button>
              </div>
              <p className="text-center text-xs text-gray-400">Make sure your link is set to public or anyone-with-link access.</p>
            </div>
          )}
        </>
      )}
      {isLoading && (
        <UploadProgress
          phase={state.phase}
          progress={"progress" in state ? state.progress : undefined}
          isUrlMode={"progress" in state && state.progress === null}
        />
      )}
      {state.phase === "error" && (
        <>
          <UploadProgress phase="error" message={state.message} />
          <button onClick={() => { reset(); setLinkUrl(""); setLinkError(""); }}
            className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Try again
          </button>
        </>
      )}
    </div>
  );
}
