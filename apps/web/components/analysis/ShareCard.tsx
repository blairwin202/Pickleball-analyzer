"use client";
import { useState } from "react";

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

export function ShareCard({ playerLabel, position, rating, confidence, strengths, weaknesses, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showText, setShowText] = useState(false);
  const [emailAddr, setEmailAddr] = useState("");
  const [phoneNum, setPhoneNum] = useState("");

  const label = duprLabel(rating);
  const colorClass = duprColor(rating);

  const shareText = `🎾 PickleballVideoIQ Results!\n\n${playerLabel} (${position})\nRating: ${formatDupr(rating)} — ${label}\n\n✅ Strengths:\n${strengths.slice(0,3).map(s => `• ${s}`).join("\n")}\n\n⚠️ Needs Work:\n${weaknesses.slice(0,2).map(w => `• ${w}`).join("\n")}\n\nAnalyzed by PickleballVideoIQ 🤖\nhttps://pickleballvideoiq.com`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: "My PickleballVideoIQ Results", text: shareText });
    } else {
      handleCopy();
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`PickleballVideoIQ Results - ${playerLabel}`);
    const body = encodeURIComponent(shareText);
    window.open(`mailto:${emailAddr}?subject=${subject}&body=${body}`);
    setShowEmail(false);
    setEmailAddr("");
  };

  const handleText = () => {
    const body = encodeURIComponent(shareText);
    window.open(`sms:${phoneNum}?body=${body}`);
    setShowText(false);
    setPhoneNum("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-green-500 to-green-700 p-6 text-white text-center">
          <p className="text-sm font-medium opacity-80 mb-1">PickleballVideoIQ</p>
          <h2 className="text-2xl font-bold">{playerLabel}</h2>
          <p className="text-sm opacity-70">{position} position</p>
        </div>

        {/* Rating */}
        <div className="flex justify-center py-6 border-b border-gray-100">
          <div className="text-center">
            <div className={`text-6xl font-bold ${colorClass}`}>{formatDupr(rating)}</div>
            <div className={`text-lg font-semibold mt-1 ${colorClass}`}>{label}</div>
            <div className="text-xs text-gray-400 mt-0.5">Confidence: {confidence}</div>
          </div>
        </div>

        {/* Strengths & weaknesses */}
        <div className="grid grid-cols-2 gap-3 p-4">
          <div className="rounded-xl bg-green-50 p-3">
            <p className="text-xs font-semibold text-green-800 mb-2">Strengths</p>
            {strengths.slice(0,3).map((s, i) => <p key={i} className="text-xs text-green-700 mb-1">• {s}</p>)}
          </div>
          <div className="rounded-xl bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-800 mb-2">Needs Work</p>
            {weaknesses.slice(0,2).map((w, i) => <p key={i} className="text-xs text-red-700 mb-1">• {w}</p>)}
          </div>
        </div>

        {/* Email input */}
        {showEmail && (
          <div className="px-4 pb-2 flex gap-2">
            <input
              autoFocus
              type="email"
              value={emailAddr}
              onChange={(e) => setEmailAddr(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEmail()}
              placeholder="Enter email address..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button onClick={handleEmail} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium">Send</button>
            <button onClick={() => setShowEmail(false)} className="text-gray-400 px-2">✕</button>
          </div>
        )}

        {/* Text input */}
        {showText && (
          <div className="px-4 pb-2 flex gap-2">
            <input
              autoFocus
              type="tel"
              value={phoneNum}
              onChange={(e) => setPhoneNum(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleText()}
              placeholder="Enter phone number..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button onClick={handleText} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium">Send</button>
            <button onClick={() => setShowText(false)} className="text-gray-400 px-2">✕</button>
          </div>
        )}

        <div className="text-center pb-1">
          <p className="text-xs text-gray-400">Analyzed by PickleballVideoIQ 🤖</p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 p-4 pt-0">
          <button onClick={handleNativeShare} className="rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700">
            📤 Share
          </button>
          <button onClick={handleCopy} className="rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>
          <button onClick={() => { setShowEmail(!showEmail); setShowText(false); }} className="rounded-xl border border-blue-200 bg-blue-50 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100">
            📧 Email
          </button>
          <button onClick={() => { setShowText(!showText); setShowEmail(false); }} className="rounded-xl border border-purple-200 bg-purple-50 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-100">
            💬 Text
          </button>
        </div>

        <div className="px-4 pb-4">
          <button onClick={onClose} className="w-full rounded-xl border border-gray-200 py-2 text-sm text-gray-400 hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
