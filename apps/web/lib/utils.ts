import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDupr(rating: number): string {
  return rating.toFixed(2);
}

export function duprLabel(rating: number): string {
  if (rating < 2.5) return "Beginner";
  if (rating < 3.0) return "Novice";
  if (rating < 3.5) return "Recreational";
  if (rating < 4.0) return "Intermediate";
  if (rating < 4.5) return "Advanced";
  if (rating < 5.0) return "Strong Advanced";
  return "Elite";
}

export function duprColor(rating: number): string {
  if (rating < 3.0) return "text-gray-500";
  if (rating < 3.5) return "text-blue-500";
  if (rating < 4.0) return "text-green-500";
  if (rating < 4.5) return "text-yellow-500";
  if (rating < 5.0) return "text-orange-500";
  return "text-red-500";
}
