// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

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
      const delRes = await fetch("/api/analyses/" + id, { method: "DELETE" });
      if (delRes.ok) { setAnalyses(prev => prev.filter((a) => a.id !== id)); }
    } catch (err) { alert("Failed to delete"); }
    setDeleting(null);
  };

  const completed = analyses.filter((a) => a.status === "complete");

  // Build progress chart data - skill band to number
  function bandToNumber(band) {
    if (!band) return null;
    const map = {
      "3.0-3.3": 3.15, "3.3-3.5": 3.4, "3.5-3.7": 3.6,
      "3.7-3.9": 3.8, "3.9-4.1": 4.0, "4.1-4.3": 4.2,
      "4.3-4.5": 4.4, "4.5-4.7": 4.6, "4.7-5.0": 4.85,
    };
    return map[band] ?? null;
  }

  // Get avg rating across all players for each session
  const chartData = completed.slice().reverse().map((a) => {
    const results = Object.values(a.player_results || {});
    const bands = results.map(r => bandToNumber(r?.analysis?.skill_band)).filter(Boolean);
    const avg = bands.length ? bands.reduce((s, v) => s + v, 0) / bands.length : null;
    return {
      date: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      avg: avg ? avg.toFixed(2) : null,
    };
  }).filter(d => d.avg);

  const minVal = 3.0;
  const maxVal = 5.0;
  const chartH = 80;
  const chartW = 260;

  function toY(val) {
    return chartH - ((parseFloat(val) - minVal) / (maxVal - minVal)) * chartH;
  }

  const points = chartData.map((d, i) => {
    const x = chartData.length === 1 ? chartW / 2 : (i / (chartData.length - 1)) * chartW;
    const y = toY(d.avg);
    return { x, y, ...d };
  });

  const polyline = points.map(p => p.x + "," + p.y).join(" ");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Your History</h1>

      {completed.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Sessions Analyzed</p>
            <p className="text-2xl font-bold text-green-600">{completed.length}</p>
            <p className="text-xs text-gray-400">total</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Latest Analysis</p>
            <p className="text-2xl font-bold text-green-600">
              {new Date(completed[0].created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
            <p className="text-xs text-gray-400">most recent</p>
          </div>
        </div>
      )}

      {chartData.length >= 2 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">Skill Rating Progress</p>
          <svg viewBox={"0 0 " + chartW + " " + chartH} className="w-full" style={{height: 90}}>
            <polyline fill="none" stroke="#16a34a" strokeWidth="2.5" points={polyline} />
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="4" fill="#16a34a" />
                <text x={p.x} y={chartH + 14} textAnchor="middle" fontSize="9" fill="#9ca3af">{p.date}</text>
                <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#16a34a" fontWeight="bold">{p.avg}</text>
              </g>
            ))}
          </svg>
          <p className="text-xs text-gray-400 mt-2 text-center">Average skill band across all players per session</p>
        </div>
      )}

      <div className="space-y-3">
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && analyses.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
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
          const hasData = Object.keys(playerResults).length > 0;
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
                  {a.status === "complete" && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      View Results
                    </span>
                  )}
                </div>
                {a.status === "complete" && hasData && (
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {positions.map((pos) => {
                      const data = playerResults[pos.id];
                      const hasPlayerData = data && data.analysis;
                      return (
                        <div key={pos.id} className={"rounded-lg p-1.5 text-center " + (hasPlayerData ? "bg-green-50" : "bg-gray-50")}>
                          <p className="text-xs text-gray-400">{pos.label}</p>
                          <p className={"text-xs font-bold " + (hasPlayerData ? "text-green-600" : "text-gray-300")}>
                            {hasPlayerData ? "OK" : "-"}
                          </p>
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
                {deleting === a.id ? "..." : "Delete"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}