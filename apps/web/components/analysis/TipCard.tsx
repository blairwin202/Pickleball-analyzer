"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Dumbbell, Zap, Target, Brain, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  footwork: <Footprints className="h-4 w-4" />,
  shot_technique: <Zap className="h-4 w-4" />,
  positioning: <Target className="h-4 w-4" />,
  strategy: <Brain className="h-4 w-4" />,
  mental: <Brain className="h-4 w-4" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-50 border-red-200",
  medium: "bg-yellow-50 border-yellow-200",
  low: "bg-blue-50 border-blue-200",
};

interface Props {
  title: string;
  category: string;
  priority: string;
  tip: string;
  drill?: string;
}

export function TipCard({ title, category, priority, tip, drill }: Props) {
  const [showDrill, setShowDrill] = useState(false);

  return (
    <div className={cn("rounded-xl border p-5 transition-all", PRIORITY_COLORS[priority] ?? "bg-gray-50 border-gray-200")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">{CATEGORY_ICONS[category] ?? <Dumbbell className="h-4 w-4" />}</span>
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 capitalize">
            {category.replace("_", " ")}
          </span>
        </div>
        <span className={cn(
          "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
          priority === "high" ? "bg-red-100 text-red-700" :
          priority === "medium" ? "bg-yellow-100 text-yellow-700" :
          "bg-blue-100 text-blue-700"
        )}>
          {priority} priority
        </span>
      </div>

      <h3 className="mt-3 font-semibold text-gray-800">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{tip}</p>

      {drill && (
        <div className="mt-3">
          <button
            onClick={() => setShowDrill(!showDrill)}
            className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
          >
            <Dumbbell className="h-3.5 w-3.5" />
            Practice drill
            {showDrill ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showDrill && (
            <p className="mt-2 rounded-lg bg-white/60 p-3 text-sm text-gray-600 leading-relaxed border border-current/10">
              {drill}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
