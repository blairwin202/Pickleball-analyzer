"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Video, Square, RotateCcw, Clock } from "lucide-react";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

const DURATIONS = [30, 60, 90];

export function VideoRecorder({ onFile, disabled }: Props) {
  const [mode, setMode] = useState<"idle"|"preview"|"recording"|"done">("idle");
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [error, setError] = useState<string|null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const recorderRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout|null>(null);

  const startPreview = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setMode("preview");
    } catch (e) {
      setError("Camera access denied. Please allow camera access and try again.");
    }
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
      setTimeLeft((t) => {
        if (t <= 1) {
          stopRecording();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [duration, onFile]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const stopStream = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stopStream();
    setMode("idle");
    setError(null);
  }, [stopStream]);

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
            {[30, 60, 90].map((d) => (
              <button key={d} onClick={() => setDuration(d)}
                className={"flex-1 rounded-xl py-2 text-sm font-semibold transition-all " + (duration === d ? "bg-white text-green-700" : "bg-white/20 text-white hover:bg-white/30")}>
                {d}s
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-red-200 text-sm mb-3">{error}</p>}
        <button onClick={startPreview} disabled={disabled}
          className="w-full rounded-xl bg-white py-3 text-green-700 font-bold text-sm hover:bg-green-50 transition-colors disabled:opacity-50">
          Open Camera
        </button>
      </div>
    );
  }

  if (mode === "preview" || mode === "recording") {
    return (
      <div className="rounded-2xl overflow-hidden bg-black">
        <div className="relative">
          <video ref={videoRef} muted playsInline className="w-full" style={{maxHeight: "60vh", objectFit: "cover"}} />
          {mode === "recording" && (
            <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-sm font-bold">{timeLeft}s</span>
            </div>
          )}
        </div>
        <div className="p-4 flex gap-3">
          <button onClick={reset} className="flex-1 rounded-xl border border-white/30 py-3 text-white text-sm font-medium hover:bg-white/10">
            Cancel
          </button>
          {mode === "preview" ? (
            <button onClick={startRecording}
              className="flex-2 flex-1 rounded-xl bg-red-500 py-3 text-white font-bold text-sm hover:bg-red-600 flex items-center justify-center gap-2">
              <div className="h-3 w-3 rounded-full bg-white" />
              Start Recording
            </button>
          ) : (
            <button onClick={stopRecording}
              className="flex-1 rounded-xl bg-red-500 py-3 text-white font-bold text-sm hover:bg-red-600 flex items-center justify-center gap-2">
              <Square className="h-4 w-4 fill-white" />
              Stop Early
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
