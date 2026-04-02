import os

# ── FILE 1: history/page.tsx ──────────────────────────────────────────────────
history = r"""// @ts-nocheck
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

  function bandToNumber(band) {
    if (!band) return null;
    const map = {
      "3.0-3.3": 3.15, "3.3-3.5": 3.4, "3.5-3.7": 3.6,
      "3.7-3.9": 3.8, "3.9-4.1": 4.0, "4.1-4.3": 4.2,
      "4.3-4.5": 4.4, "4.5-4.7": 4.6, "4.7-5.0": 4.85,
    };
    return map[band] ?? null;
  }

  const chartData = completed.slice().reverse().map((a) => {
    const results = Object.values(a.player_results || {});
    const bands = results.map(r => bandToNumber(r?.analysis?.skill_band)).filter(Boolean);
    const avg = bands.length ? bands.reduce((s, v) => s + v, 0) / bands.length : null;
    return {
      date: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      avg: avg ? avg.toFixed(2) : null,
    };
  }).filter(d => d.avg);

  const chartH = 80;
  const chartW = 260;
  function toY(val) {
    return chartH - ((parseFloat(val) - 3.0) / (5.0 - 3.0)) * chartH;
  }
  const points = chartData.map((d, i) => {
    const x = chartData.length === 1 ? chartW / 2 : (i / (chartData.length - 1)) * chartW;
    return { x, y: toY(d.avg), ...d };
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

      {chartData.length >= 1 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">Skill Rating Progress</p>
          <svg viewBox={"0 0 " + chartW + " " + (chartH + 20)} className="w-full" style={{height: 110}}>
            {chartData.length >= 2 && <polyline fill="none" stroke="#16a34a" strokeWidth="2.5" points={polyline} />}
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#16a34a" />
                <text x={p.x} y={chartH + 18} textAnchor="middle" fontSize="9" fill="#9ca3af">{p.date}</text>
                <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="9" fill="#16a34a" fontWeight="bold">{p.avg}</text>
              </g>
            ))}
          </svg>
          <p className="text-xs text-gray-400 mt-1 text-center">Avg skill band per session</p>
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
              <Link href={"/analysis/" + a.id} className="flex flex-1 flex-col rounded-xl bg-white px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{a.status}</p>
                  </div>
                  {a.status === "complete" && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">View Results</span>
                  )}
                </div>
                {a.status === "complete" && hasData && (
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {positions.map((pos) => {
                      const data = playerResults[pos.id];
                      const ok = data && data.analysis;
                      return (
                        <div key={pos.id} className={"rounded-lg p-1.5 text-center " + (ok ? "bg-green-50" : "bg-gray-50")}>
                          <p className="text-xs text-gray-400">{pos.label}</p>
                          <p className={"text-xs font-bold " + (ok ? "text-green-600" : "text-gray-300")}>{ok ? "done" : "-"}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Link>
              <button onClick={(e) => handleDelete(e, a.id)} disabled={deleting === a.id}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
                {deleting === a.id ? "..." : "Delete"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
"""

# ── FILE 2: analysis/[id]/page.tsx — just patch the share URL line ────────────
analysis_path = r"C:\Users\blair\Documents\pickleball-analyzer\apps\web\app\(dashboard)\analysis\[id]\page.tsx"
with open(analysis_path, "r", encoding="utf-8") as f:
    analysis = f.read()

old = "navigator.clipboard.writeText(https://pickleballvideoiq.netlify.app/share/);"
new = "const nameParams = Object.entries(playerNames).filter(([,v]) => v).map(([k,v]) => k + '=' + encodeURIComponent(v)).join('&'); navigator.clipboard.writeText(https://pickleballvideoiq.netlify.app/share/ + (nameParams ? '?' + nameParams : ''));"

# Also fix the star emoji on the court diagram
analysis = analysis.replace("\"\\u00e2\\u02c6\\u00a5\"", '"★"')
analysis = analysis.replace('"â˜…"', '"★"')

if old in analysis:
    analysis = analysis.replace(old, new)
    print("Patched share URL in analysis page")
else:
    print("WARNING: share URL line not found - check manually")

with open(analysis_path, "w", encoding="utf-8") as f:
    f.write(analysis)

# ── FILE 3: share/[id]/page.tsx ───────────────────────────────────────────────
share = '''// @ts-nocheck
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SharePage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, status, player_results, created_at")
    .eq("id", id)
    .single();

  if (!analysis || analysis.status !== "complete") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-2">🎾</p>
          <p className="text-gray-600">Analysis not found or still processing.</p>
          <Link href="/" className="mt-4 inline-block text-green-600 font-medium hover:underline">Analyze your own game</Link>
        </div>
      </div>
    );
  }

  const playerResults = analysis.player_results || {};
  const positions = [
    { id: "near-left",  label: "Player 1", sub: "Near Left" },
    { id: "near-right", label: "Player 2", sub: "Near Right" },
    { id: "far-left",   label: "Player 3", sub: "Far Left" },
    { id: "far-right",  label: "Player 4", sub: "Far Right" },
  ];

  const playerNames = {
    "near-left":  sp?.["near-left"]  ? decodeURIComponent(sp["near-left"])  : null,
    "near-right": sp?.["near-right"] ? decodeURIComponent(sp["near-right"]) : null,
    "far-left":   sp?.["far-left"]   ? decodeURIComponent(sp["far-left"])   : null,
    "far-right":  sp?.["far-right"]  ? decodeURIComponent(sp["far-right"])  : null,
  };

  function skillLevel(a) {
    if (!a) return null;
    const avg = ((a.shot_quality?.overall ?? 5) + (a.footwork?.score ?? 5) + (a.positioning?.score ?? 5)) / 3;
    if (avg >= 8) return { label: "Advanced",      color: "#f97316", bg: "#fff7ed" };
    if (avg >= 6) return { label: "Intermediate",  color: "#16a34a", bg: "#f0fdf4" };
    if (avg >= 4) return { label: "Recreational",  color: "#3b82f6", bg: "#eff6ff" };
    return            { label: "Beginner",        color: "#6b7280", bg: "#f9fafb" };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-bold text-green-700">PickleballVideoIQ</span>
          {isLoggedIn ? (
            <Link href="/" className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700">Analyze My Game</Link>
          ) : (
            <Link href={"/login?redirect=/share/" + id} className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700">Sign Up Free</Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Game Analysis Results</h1>
          <p className="text-gray-500 mt-1">AI-powered coaching insights for all 4 players</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {positions.map((pos) => {
            const data = playerResults[pos.id];
            const pa = data?.analysis;
            const strengths = pa?.strengths || [];
            const weaknesses = pa?.weaknesses || [];
            const tips = data?.tips || [];
            const skill = skillLevel(pa);
            const displayName = playerNames[pos.id] || pos.label;
            if (!data) return null;
            return (
              <div key={pos.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="mb-3">
                  <p className="text-sm font-bold text-gray-800">{displayName}</p>
                  <p className="text-xs text-gray-500">{pos.sub}</p>
                  {pa?.skill_band && <p className="text-xs font-semibold text-green-700 mt-0.5">Band: {pa.skill_band}</p>}
                  {skill && <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: skill.color, background: skill.bg }}>{skill.label}</span>}
                </div>
                {strengths.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-green-800 mb-1">Strengths</p>
                    {strengths.slice(0,2).map((s, i) => <p key={i} className="text-xs text-green-700">- {s}</p>)}
                  </div>
                )}
                {weaknesses.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-red-800 mb-1">Needs Work</p>
                    {weaknesses.slice(0,2).map((w, i) => <p key={i} className="text-xs text-red-700">- {w}</p>)}
                  </div>
                )}
                {isLoggedIn ? (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs font-semibold text-gray-700">Pro Tips and Drills</p>
                    {tips.map((tip, i) => (
                      <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-gray-800">{tip.title}</p>
                          <span className={"text-xs px-1.5 py-0.5 rounded-full font-medium " + (tip.priority === "high" ? "bg-red-100 text-red-700" : tip.priority === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700")}>{tip.priority}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{tip.tip}</p>
                        {tip.drill && <div className="rounded bg-blue-50 p-2"><p className="text-xs font-medium text-blue-800">Drill: {tip.drill}</p></div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-100 p-3 text-center">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Pro Tips and Drills</p>
                    <p className="text-xs text-gray-400 mb-2">Sign up free to unlock {tips.length} personalized drills</p>
                    <Link href={"/login?redirect=/share/" + id} className="inline-block text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700">Unlock Free</Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!isLoggedIn && (
          <div className="rounded-2xl bg-green-600 p-6 text-center text-white">
            <p className="text-lg font-bold mb-1">Want YOUR game analyzed?</p>
            <p className="text-sm opacity-80 mb-4">Upload a 30-second video and get AI-powered strengths, weaknesses and personalized drills.</p>
            <Link href={"/login?redirect=/share/" + id} className="inline-block bg-white text-green-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-50">Sign Up Free</Link>
          </div>
        )}
        <p className="text-center text-xs text-gray-400">Analyzed by PickleballVideoIQ</p>
      </main>
    </div>
  );
}
'''

files = {
    r"C:\Users\blair\Documents\pickleball-analyzer\apps\web\app\(dashboard)\history\page.tsx": history,
    r"C:\Users\blair\Documents\pickleball-analyzer\apps\web\app\share\[id]\page.tsx": share,
}

for path, content in files.items():
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Written:", path)

print("ALL DONE")
