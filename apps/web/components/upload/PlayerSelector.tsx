"use client";
import { useState } from "react";

export type PlayerPosition = "near-left" | "near-right" | "far-left" | "far-right";

interface Props {
  onSelect: (position: PlayerPosition) => void;
}

const positions = [
  { id: "far-left",   label: "Far Left",   top: "18%", left: "28%" },
  { id: "far-right",  label: "Far Right",  top: "18%", left: "68%" },
  { id: "near-left",  label: "Near Left",  top: "72%", left: "28%" },
  { id: "near-right", label: "Near Right", top: "72%", left: "68%" },
];

export function PlayerSelector({ onSelect }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">Which player are you?</h2>
        <p className="mt-1 text-sm text-gray-500">Tap the arrow that points to you on the court</p>
      </div>
      <div className="relative mx-auto w-full max-w-sm" style={{ aspectRatio: "1.8 / 1" }}>
        <div className="absolute inset-0 rounded-xl border-4 border-green-700 bg-green-600 overflow-hidden">
          <div className="absolute left-0 right-0 border-t-2 border-white opacity-60" style={{ top: "38%" }} />
          <div className="absolute left-0 right-0 border-t-2 border-white opacity-60" style={{ top: "62%" }} />
          <div className="absolute top-0 bottom-0 border-l-2 border-white opacity-60" style={{ left: "50%" }} />
          <div className="absolute left-0 right-0 border-t-4 border-white" style={{ top: "50%" }} />
          <div className="absolute top-2 left-0 right-0 text-center text-white text-xs font-medium opacity-70">Far side</div>
          <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs font-medium opacity-70">Near side</div>
        </div>
        {positions.map((pos) => (
          <button
            key={pos.id}
            onClick={() => setSelected(pos.id)}
            style={{ top: pos.top, left: pos.left, transform: "translate(-50%, -50%)", position: "absolute" }}
          >
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: selected === pos.id ? "3px solid orange" : "2px solid gray", background: selected === pos.id ? "#facc15" : "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              👤
            </div>
            {selected === pos.id && <div style={{ fontSize: 10, fontWeight: "bold", textAlign: "center" }}>YOU</div>}
          </button>
        ))}
      </div>
      <button
        disabled={!selected}
        onClick={() => selected && onSelect(selected)}
        className="w-full rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {selected ? "Analyze as " + positions.find(p => p.id === selected)?.label + " player →" : "Tap yourself on the court above"}
      </button>
    </div>
  );
}
