"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

interface ComponentScores {
  shot_quality: number;
  footwork: number;
  positioning: number;
  consistency: number;
}

interface Props {
  componentScores: ComponentScores;
  shotAnalysis?: {
    overall: number;
    observations: string;
    serve?: number;
    dink?: number;
    drive?: number;
    volley?: number;
  };
}

export function ShotBreakdown({ componentScores, shotAnalysis }: Props) {
  const radarData = [
    { subject: "Shot Quality", value: componentScores.shot_quality },
    { subject: "Footwork", value: componentScores.footwork },
    { subject: "Positioning", value: componentScores.positioning },
    { subject: "Consistency", value: componentScores.consistency },
  ];

  const shotTypes = shotAnalysis
    ? [
        { name: "Serve", score: shotAnalysis.serve },
        { name: "Dink", score: shotAnalysis.dink },
        { name: "Drive", score: shotAnalysis.drive },
        { name: "Volley", score: shotAnalysis.volley },
      ].filter((s) => s.score != null)
    : [];

  return (
    <div className="space-y-6">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
            <Radar dataKey="value" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} />
            <Tooltip formatter={(v) => [`${v}/10`, ""]} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {shotTypes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Shot Scores</h4>
          {shotTypes.map(({ name, score }) => (
            <div key={name} className="flex items-center gap-3">
              <span className="w-16 text-sm text-gray-600">{name}</span>
              <div className="flex-1 rounded-full bg-gray-100 h-2">
                <div
                  className="h-2 rounded-full bg-green-500 transition-all"
                  style={{ width: `${(score! / 10) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right text-sm font-medium text-gray-700">{score}/10</span>
            </div>
          ))}
        </div>
      )}

      {shotAnalysis?.observations && (
        <p className="text-sm text-gray-600 leading-relaxed">{shotAnalysis.observations}</p>
      )}
    </div>
  );
}
