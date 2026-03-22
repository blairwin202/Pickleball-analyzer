// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";

export type PlayerResult = {
  label: string;
  analysis: {
    estimated_dupr: number;
    confidence: string;
    strengths: string[];
    weaknesses: string[];
    shot_quality?: { overall: number; observations: string };
    footwork?: { score: number; observations: string };
    positioning?: { score: number; observations: string };
    consistency?: { score: number; observations: string };
  };
  tips: Array<{
    title: string;
    category: string;
    priority: string;
    tip: string;
    drill?: string;
  }>;
};

export type Analysis = {
  id: string;
  status: "pending" | "processing" | "complete" | "failed";
  error_message?: string;
  rating?: number;
  rating_confidence?: "low" | "medium" | "high";
  component_scores?: {
    shot_quality: number;
    footwork: number;
    positioning: number;
    consistency: number;
  };
  strengths?: string[];
  weaknesses?: string[];
  tips?: Array<{
    id: string;
    title: string;
    category: string;
    priority: string;
    tip_text: string;
    drill_text?: string;
  }>;
  player_results?: {
    "near-left"?: PlayerResult;
    "near-right"?: PlayerResult;
    "far-left"?: PlayerResult;
    "far-right"?: PlayerResult;
  };
  created_at?: string;
};

export function useAnalysis(analysisId: string | null) {
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!analysisId) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/analyses/${analysisId}`);
        if (!res.ok) { setError("Analysis not found"); return; }
        const data = await res.json();
        setAnalysis(data);
        if (data.status === "complete" || data.status === "failed") {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        setError("Failed to fetch analysis");
      }
    };
    poll();
    intervalRef.current = setInterval(poll, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [analysisId]);

  return { analysis, error };
}
