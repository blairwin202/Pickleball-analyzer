// @ts-nocheck
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Video, Square, RotateCcw } from "lucide-react";
const DURATIONS = [30, 60, 90];
export function VideoRecorder({ onFile, disabled }) {
  const [mode, setMode] = useState("idle");
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const stopStream = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }, []);
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm";
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType === "video/mp4" ? "mp4" : "webm";
      const file = new File([blob], "pickleball-recording." + ext, { type: mimeType });
      stopStream();
      setMode("done");
      onFile(file);
    };
    recorderRef.current = recorder;
    recorder.start(1000);
    setMode("recording");
    setTimeLeft(duration);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => { if (t <= 1) { stopRecording(); return 0; } return t - 1; });
    }, 1000);
  }, [duration, onFile, stopStream, stopRecording]);
  const startPreview = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("autoplay", "true");
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Autoplay failed, user interaction required:", playErr);
        }
      }
      setMode("preview");
    } catch (e) {
      console.error("Camera error:", e);
      if (e.name === "NotAllowedError") {
        setError("Camera access denied. Please allow camera access in your browser settings and try again.");
      } else if (e.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else if (e.name === "NotReadableError") {
        setError("Camera is in use by another app. Close other apps and try again.");
      } else {
        setError("Could not access camera: " + e.message);
      }
    }
  }, []);
  const reset = useCallback(() => { stopStream(); setMode("idle"); setError(null); }, [stopStream]);
  useEffect(() => () => stopStream(), [stopStream]);
  if (mode === "idle") {
    return (
      <div className="rounded-2xl bg-green-600 p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Video className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-lg">Record at the Court</p>
            <p className="text-sm text-green-100">Use your camera directly in the app</p>
          </div>
        </div>
        <div className="mb-4">
          <p className="text-sm text-green-100 mb-2">Recording duration:</p>
          <div className="flex gap-2">
            {DURATIONS.map((d) => (
              <button key={d} onClick={() => setDuration(d)}
                className={"flex-1 rounded-xl py-2 text-sm font-semibold transition-all " + (duration === d ? "bg-white text-green-700" : "bg-white/20 text-white hover:bg-white/30")}>
                {d}s
              </button>
            ))}
          </div>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-white">{error}</p>}
        <button onClick={startPreview} disabled={disabled}
          className="w-full rounded-xl bg-white py-3 text-sm font-bold text-green-700 hover:bg-green-50 active:scale-[0.98] transition-all disabled:opacity-50">
          Open Camera
        </button>
      </div>
    );
  }
  if (mode === "preview" || mode === "recording") {
    const pct = mode === "recording" ? ((duration - timeLeft) / duration) * 100 : 0;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return (
      <div className="rounded-2xl overflow-hidden bg-black">
        <div className="relative">
          <video
            ref={videoRef}
            muted
            autoPlay
            playsInline
            className="w-full aspect-video object-cover bg-black"
          />
          {mode === "recording" && (
            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-bold text-white tabular-nums">
                {mins > 0 ? mins + ":" + String(secs).padStart(2, "0") : secs + "s"}
              </span>
            </div>
          )}
          {mode === "recording" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: pct + "%" }} />
            </div>
          )}
          {mode === "preview" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-black/40 px-4 py-2">
                <p className="text-sm text-white font-medium">Tap Start Recording when ready</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 bg-gray-900 px-4 py-4">
          <button onClick={reset} className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10">
            <RotateCcw className="h-4 w-4" /> Cancel
          </button>
          {mode === "preview" ? (
            <button onClick={startRecording}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 active:scale-[0.98] transition-all">
              <div className="h-3 w-3 rounded-full bg-white" />
              Start Recording ({duration}s)
            </button>
          ) : (
            <button onClick={stopRecording}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-gray-900 hover:bg-gray-100 active:scale-[0.98] transition-all">
              <Square className="h-4 w-4 fill-gray-900" /> Stop & Analyze
            </button>
          )}
        </div>
      </div>
    );
  }
  if (mode === "done") {
    return (
      <div className="rounded-2xl bg-green-600 p-6 text-white text-center">
        <p className="font-bold text-lg mb-1">Recording complete!</p>
        <p className="text-sm text-green-100">Uploading and analyzing your footage...</p>
      </div>
    );
  }
  return null;
}
