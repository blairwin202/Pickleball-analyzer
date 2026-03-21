"use client";

import { formatDupr, duprLabel, duprColor, cn } from "@/lib/utils";

interface Props {
  rating: number;
  confidence: "low" | "medium" | "high";
  size?: "sm" | "lg";
}

export function RatingBadge({ rating, confidence, size = "lg" }: Props) {
  const label = duprLabel(rating);
  const colorClass = duprColor(rating);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn(
        "flex items-center justify-center rounded-full border-4 font-bold tabular-nums",
        size === "lg" ? "h-32 w-32 text-4xl border-current" : "h-16 w-16 text-xl border-current",
        colorClass
      )}>
        {formatDupr(rating)}
      </div>
      <div className="text-center">
        <p className={cn("font-semibold", size === "lg" ? "text-lg" : "text-sm", colorClass)}>{label}</p>
        <p className="text-xs text-gray-400">
          Confidence: <span className="capitalize">{confidence}</span>
        </p>
      </div>
    </div>
  );
}
