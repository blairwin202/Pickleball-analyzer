// @ts-nocheck
"use client";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useAnalysis } from "@/hooks/useAnalysis";

const POSITIONS = [
  { id: "near-left",  label: "Player 1", sub: "Near Left" },
  { id: "near-right", label: "Player 2", sub: "Near Right" },
  { id: "far-left",   label: "Player 3", sub: "Far Left" },
  { id: "far-right",  label: "Player 4", sub: "Far Right" },
];

export default function AnalysisPage() {
  const params = useParams();
  const id = params?.id as string | null;
  const { analysis, error } = useAnalysis(id);
  const [selectedPlayer, setSelectedPlayer] = useState(0);
  const [playerNames, setPlayerNames] = useState({ "near-left": "", "near-right": "", "far-left": "", "far-right": "" });
  const [editingName, setEditingName] = useState(null);
  const [tempName, setTempName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      try {
        const saved = localStorage.getItem("playerNames-" + id);
        if (saved) setPlayerNames(JSON.parse(saved));
      } catch(e) {}
    }
  }, [id]);

  const saveName = (posId) => {
    const updated = { ...playerNames, [posId]: tempName };
    setPlayerNames(updated);
    try { localStorage.setItem("playerNames-" + id, JSON.stringify(updated)); } catch(e) {}
    setEditingName(null);
    setTempName("");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://pickleballvideoiq.netlify.app/share/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
  const strengths = playerAnalysis?.strengths ?? [];
  const weaknesses = playerAnalysis?.weaknesses ?? [];
  const currentName = playerNames[pos.id];
  const displayName = currentName || pos.label;

  function skillLevel(analysis) {
    if (!analysis) return null;
    const shot = analysis.shot_quality?.overall ?? 5;
    const foot = analysis.footwork?.score ?? 5;
    const pos = analysis.positioning?.score ?? 5;
    const avg = (shot + foot + pos) / 3;
    if (avg >= 8) return { label: "Advanced", color: "text-orange-500", bg: "bg-orange-50" };
    if (avg >= 6) return { label: "Intermediate", color: "text-green-600", bg: "bg-green-50" };
    if (avg >= 4) return { label: "Recreational", color: "text-blue-500", bg: "bg-blue-50" };
    return { label: "Beginner", color: "text-gray-500", bg: "bg-gray-50" };
  }

  const skill = skillLevel(playerAnalysis);

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
          <button onClick={handleCopyLink} className={"flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all " + (copied ? "bg-green-100 text-green-700" : "bg-green-600 text-white hover:bg-green-700")}>
            {copied ? "Link Copied!" : "Share Results"}
          </button>
        </div>

        {skill && (
          <div className={"inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mb-4 " + skill.bg + " " + skill.color}>
            {skill.label} Level
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
    </div>
  );
}