// @ts-nocheck
"use client";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { ShareCard } from "@/components/analysis/ShareCard";

const POSITIONS = [
  { id: "near-left",  label: "Player 1", sub: "Near Left",  emoji: "green" },
  { id: "near-right", label: "Player 2", sub: "Near Right", emoji: "blue" },
  { id: "far-left",   label: "Player 3", sub: "Far Left",   emoji: "yellow" },
  { id: "far-right",  label: "Player 4", sub: "Far Right",  emoji: "red" },
];

export default function AnalysisPage() {
  const params = useParams();
  const id = params?.id as string | null;
  const { analysis, error } = useAnalysis(id);
  const [selectedPlayer, setSelectedPlayer] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [playerNames, setPlayerNames] = useState({ "near-left": "", "near-right": "", "far-left": "", "far-right": "" });
  const [editingName, setEditingName] = useState(null);
  const [tempName, setTempName] = useState("");

  useEffect(() => {
    if (id) {
      try {
        const saved = localStorage.getItem("playerNames-" + id);
        if (saved) setPlayerNames(JSON.parse(saved));
      } catch(e) {}
    }
  }, [id]);

  const saveName = (posId: string) => {
    const updated = { ...playerNames, [posId]: tempName };
    setPlayerNames(updated);
    try { localStorage.setItem("playerNames-" + id, JSON.stringify(updated)); } catch(e) {}
    setEditingName(null);
    setTempName("");
  };

  if (error) return <div className="text-center text-red-500 py-12">{error}</div>;

  if (!analysis || analysis.status === "pending" || analysis.status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
        <p className="text-gray-600 font-medium">Analyzing all 4 players...</p>
        <p className="text-sm text-gray-400">This takes 2-3 minutes</p>
      </div>
    );
  }

  if (analysis.status === "failed") {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-medium">Analysis failed</p>
        <p className="text-sm text-gray-400 mt-1">{analysis.error_message}</p>
      </div>
    );
  }

  const pos = POSITIONS[selectedPlayer];
  const playerData = analysis.player_results?.[pos.id];
  const playerAnalysis = playerData?.analysis;
  const playerTips = playerData?.tips ?? [];
  const rating = playerData?.blended_rating ?? playerAnalysis?.estimated_dupr;
  const confidence = playerAnalysis?.confidence ?? "medium";
  const strengths = playerAnalysis?.strengths ?? [];
  const weaknesses = playerAnalysis?.weaknesses ?? [];
  const currentName = playerNames[pos.id];
  const displayName = currentName || pos.label;

  function ratingColor(r) {
    if (!r) return "text-gray-500";
    if (r < 2.5) return "text-gray-500";
    if (r < 3.5) return "text-blue-500";
    if (r < 4.5) return "text-green-600";
    if (r < 5.5) return "text-orange-500";
    return "text-red-500";
  }

  function ratingLabel(r) {
    if (!r) return "Unknown";
    if (r < 2.5) return "Beginner";
    if (r < 3.5) return "Recreational";
    if (r < 4.5) return "Intermediate";
    if (r < 5.5) return "Advanced";
    return "Pro";
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Game Analysis</h1>
        <p className="mt-1 text-gray-500">Tap a player on the court to see their results. Tap their name to edit it.</p>
      </div>

      <div className="relative mx-auto w-full max-w-sm rounded-2xl overflow-hidden border-4 border-green-700 bg-green-600" style={{ aspectRatio: "1.8/1" }}>
        <div className="absolute left-0 right-0 border-t-2 border-white opacity-50" style={{ top: "38%" }} />
        <div className="absolute left-0 right-0 border-t-2 border-white opacity-50" style={{ top: "62%" }} />
        <div className="absolute top-0 bottom-0 border-l-2 border-white opacity-50" style={{ left: "50%" }} />
        <div className="absolute left-0 right-0 border-t-4 border-white" style={{ top: "50%" }} />
        <div className="absolute left-1/2 -translate-x-1/2 bg-white text-green-700 text-xs font-bold px-2 rounded z-10" style={{ top: "calc(50% - 9px)" }}>NET</div>
        <div className="absolute top-1 left-0 right-0 text-center text-white text-xs opacity-70 font-medium">Far side</div>
        <div className="absolute bottom-1 left-0 right-0 text-center text-white text-xs opacity-70 font-medium">Near side</div>
        {[
          { idx: 0, top: "72%", left: "28%" },
          { idx: 1, top: "72%", left: "68%" },
          { idx: 2, top: "18%", left: "28%" },
          { idx: 3, top: "18%", left: "68%" },
        ].map(({ idx, top, left }) => {
          const p = POSITIONS[idx];
          const name = playerNames[p.id];
          return (
            <button key={idx} onClick={() => setSelectedPlayer(idx)} style={{ top, left, transform: "translate(-50%,-50%)", position: "absolute" }} className="flex flex-col items-center gap-0.5">
                <div className={"w-10 h-10 rounded-full border-2 flex items-center justify-center text-base font-bold shadow transition-all " + (selectedPlayer === idx ? "bg-yellow-400 border-yellow-600 scale-125" : "bg-white border-gray-300 text-gray-700 hover:scale-110")}>
                  {selectedPlayer === idx ? "★" : (idx + 1)}
                </div>
              <span className="text-xs text-white font-medium bg-black/40 rounded px-1">{name || "P" + (idx+1)}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            {editingName === pos.id ? (
              <div className="flex items-center gap-2">
                <input autoFocus value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveName(pos.id)} placeholder="Enter name..." className="border border-green-400 rounded-lg px-2 py-1 text-sm w-32 focus:outline-none" />
                <button onClick={() => saveName(pos.id)} className="text-xs bg-green-600 text-white px-2 py-1 rounded-lg">Save</button>
                <button onClick={() => setEditingName(null)} className="text-xs text-gray-400">Cancel</button>
              </div>
            ) : (
              <button onClick={() => { setEditingName(pos.id); setTempName(currentName); }} className="text-left">
                <h2 className="text-xl font-bold text-gray-900 hover:text-green-600">{displayName}</h2>
                <p className="text-sm text-gray-500">{pos.sub} position - tap name to edit</p>
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { navigator.clipboard.writeText(`https://pickleballvideoiq.netlify.app/share/${id}`); alert("Link copied! Share it with your playing partners."); }} className="flex items-center gap-2 rounded-xl border border-green-600 px-4 py-2 text-sm font-semibold text-green-600 hover:bg-green-50">
              Copy Link
            </button>
            <button onClick={() => setShowShare(true)} className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
              Share
            </button>
          </div>
        </div>

        {rating && (
          <div className="flex flex-col items-center mb-6">
            <div className={"text-6xl font-bold tabular-nums " + ratingColor(rating)}>{rating.toFixed(2)}</div>
            <div className={"text-lg font-semibold mt-1 " + ratingColor(rating)}>{ratingLabel(rating)}</div>
            <div className="text-xs text-gray-400 mt-0.5">Confidence: {confidence}</div>
          </div>
        )}

        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {strengths.length > 0 && (
              <div className="rounded-xl bg-green-50 p-4">
                <h3 className="text-sm font-semibold text-green-800 mb-2">Strengths</h3>
                <ul className="space-y-1">{strengths.map((s, i) => <li key={i} className="text-xs text-green-700">- {s}</li>)}</ul>
              </div>
            )}
            {weaknesses.length > 0 && (
              <div className="rounded-xl bg-red-50 p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">Needs Work</h3>
                <ul className="space-y-1">{weaknesses.map((w, i) => <li key={i} className="text-xs text-red-700">- {w}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        {playerTips.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Pro Tips and Drills</h3>
            <div className="space-y-3">
              {playerTips.map((tip, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-800">{tip.title}</h4>
                    <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (tip.priority === "high" ? "bg-red-100 text-red-700" : tip.priority === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700")}>{tip.priority}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{tip.tip}</p>
                  {tip.drill && <div className="rounded-lg bg-blue-50 p-2"><p className="text-xs font-medium text-blue-800">Drill: {tip.drill}</p></div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {!playerData && <p className="text-center text-gray-400 text-sm py-8">No data available for this player position</p>}
      </div>

      {showShare && (
        <ShareCard playerLabel={displayName} position={pos.sub} rating={rating ?? 3.0} confidence={confidence} strengths={strengths} weaknesses={weaknesses} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}