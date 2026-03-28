// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

function formatDupr(r) { return Number(r).toFixed(2); }
function duprLabel(r) {
  if (!r) return "Unknown";
  if (r < 2.5) return "Beginner";
  if (r < 3.5) return "Recreational";
  if (r < 4.5) return "Intermediate";
  if (r < 5.5) return "Advanced";
  return "Pro";
}
function duprColor(r) {
  if (!r) return "text-gray-400";
  if (r < 2.5) return "text-gray-500";
  if (r < 3.5) return "text-blue-500";
  if (r < 4.5) return "text-green-600";
  if (r < 5.5) return "text-orange-500";
  return "text-red-500";
}
function duprBg(r) {
  if (!r) return "bg-gray-100";
  if (r < 2.5) return "bg-gray-100";
  if (r < 3.5) return "bg-blue-50";
  if (r < 4.5) return "bg-green-50";
  if (r < 5.5) return "bg-orange-50";
  return "bg-red-50";
}

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetch("/api/analyses")
      .then((r) => r.json())
      .then((data) => { setAnalyses(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this analysis?")) return;
    setDeleting(id);
    try {
      await fetch("/api/analyses/" + id, { method: "DELETE" });
      setAnalyses(analyses.filter((a) => a.id !== id));
    } catch (err) {
      alert("Failed to delete");
    }
    setDeleting(null);
  };

  const completed = analyses.filter((a) => a.status === "complete" && a.rating);
  const chartData = [...completed].reverse().map((a, i) => ({
    n: i + 1,
    rating: a.rating,
    date: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  const bestRating = completed.length > 0 ? Math.max(...completed.map((a) => a.rating)) : null;
  const latestRating = completed.length > 0 ? completed[0].rating : null;
  const prevRating = completed.length > 1 ? completed[1].rating : null;
  const trend = latestRating && prevRating ? latestRating - prevRating : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Your Progress</h1>

      {completed.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Latest Rating</p>
            <p className={"text-2xl font-bold " + duprColor(latestRating)}>{formatDupr(latestRating)}</p>
            <p className={"text-xs font-medium " + duprColor(latestRating)}>{duprLabel(latestRating)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Personal Best</p>
            <p className={"text-2xl font-bold " + duprColor(bestRating)}>{formatDupr(bestRating)}</p>
            <p className="text-xs text-yellow-500 font-medium">⭐ Best</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Sessions</p>
            <p className="text-2xl font-bold text-gray-800">{completed.length}</p>
            <p className="text-xs text-gray-400">analyzed</p>
          </div>
        </div>
      )}

      {trend !== null && (
        <div className={"rounded-2xl p-4 text-center " + (trend >= 0 ? "bg-green-50" : "bg-red-50")}>
          <p className={"text-sm font-semibold " + (trend >= 0 ? "text-green-700" : "text-red-700")}>
            {trend >= 0 ? "📈" : "📉"} Your rating {trend >= 0 ? "improved" : "dropped"} {Math.abs(trend).toFixed(2)} since your last session
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Keep uploading videos to track your progress over time</p>
        </div>
      )}

      {chartData.length >= 1 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">Rating Over Time</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[1, 6]} tick={{ fontSize: 11 }} ticks={[2, 2.5, 3, 3.5, 4, 4.5, 5]} />
                <Tooltip formatter={(v) => [formatDupr(v), "Rating"]} />
                {bestRating && <ReferenceLine y={bestRating} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Best", position: "right", fontSize: 10, fill: "#f59e0b" }} />}
                <Line type="monotone" dataKey="rating" stroke="#16a34a" strokeWidth={2} dot={{ fill: "#16a34a", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && analyses.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-3xl mb-2">🎾</p>
            <p className="text-gray-600 font-medium">No analyses yet</p>
            <p className="text-sm text-gray-400 mt-1">Upload a video to get started</p>
            <Link href="/" className="mt-4 inline-block text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Analyze My Game
            </Link>
          </div>
        )}
        {analyses.map((a) => {
          const playerResults = a.player_results || {};
          const positions = [
            { id: "near-left", label: "P1" },
            { id: "near-right", label: "P2" },
            { id: "far-left", label: "P3" },
            { id: "far-right", label: "P4" },
          ];
          return (
            <div key={a.id} className="flex items-center gap-2">
              <Link
                href={"/analysis/" + a.id}
                className="flex flex-1 flex-col rounded-xl bg-white px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{a.status}</p>
                  </div>
                  {a.rating && (
                    <div className="text-right">
                      <p className={"text-xl font-bold tabular-nums " + duprColor(a.rating)}>{formatDupr(a.rating)}</p>
                      <p className="text-xs text-gray-400">{duprLabel(a.rating)}</p>
                    </div>
                  )}
                </div>
                {a.status === "complete" && Object.keys(playerResults).length > 0 && (
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {positions.map((pos) => {
                      const r = playerResults[pos.id]?.analysis?.estimated_dupr;
                      return (
                        <div key={pos.id} className={"rounded-lg p-1.5 text-center " + duprBg(r)}>
                          <p className="text-xs text-gray-400">{pos.label}</p>
                          <p className={"text-sm font-bold " + duprColor(r)}>{r ? formatDupr(r) : "-"}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Link>
              <button
                onClick={(e) => handleDelete(e, a.id)}
                disabled={deleting === a.id}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {deleting === a.id ? "..." : "🗑️"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}