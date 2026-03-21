"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function formatDupr(r) { return Number(r).toFixed(2); }
function duprLabel(r) {
  if (r < 2.5) return "Beginner";
  if (r < 3.5) return "Recreational";
  if (r < 4.5) return "Intermediate";
  if (r < 5.5) return "Advanced";
  return "Pro";
}
function duprColor(r) {
  if (r < 2.5) return "text-gray-500";
  if (r < 3.5) return "text-blue-500";
  if (r < 4.5) return "text-green-600";
  if (r < 5.5) return "text-orange-500";
  return "text-red-500";
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
      await fetch(`/api/analyses/${id}`, { method: "DELETE" });
      setAnalyses(analyses.filter((a) => a.id !== id));
    } catch (err) {
      alert("Failed to delete");
    }
    setDeleting(null);
  };

  const chartData = analyses
    .filter((a) => a.status === "complete" && a.rating)
    .reverse()
    .map((a, i) => ({
      n: i + 1,
      rating: a.rating,
      date: new Date(a.created_at).toLocaleDateString(),
    }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Your History</h1>

      {chartData.length >= 2 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">Rating Over Time</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[1, 6]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [formatDupr(v), "Rating"]} />
                <Line type="monotone" dataKey="rating" stroke="#16a34a" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && analyses.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">No analyses yet.</p>
            <Link href="/" className="mt-3 inline-block text-sm text-green-600 hover:underline">Upload your first video</Link>
          </div>
        )}
        {analyses.map((a) => (
          <div key={a.id} className="flex items-center gap-2">
            <Link
              href={`/analysis/${a.id}`}
              className="flex flex-1 items-center justify-between rounded-xl bg-white px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{a.status}</p>
              </div>
              {a.rating && (
                <div className="text-right">
                  <p className={`text-xl font-bold tabular-nums ${duprColor(a.rating)}`}>{formatDupr(a.rating)}</p>
                  <p className="text-xs text-gray-400">{duprLabel(a.rating)}</p>
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
        ))}
      </div>
    </div>
  );
}
