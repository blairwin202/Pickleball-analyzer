// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function SharePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const { data: analysis } = await supabase
    .from('analyses')
    .select('id, status, player_results, created_at')
    .eq('id', id)
    .single();

  if (!analysis || analysis.status !== 'complete') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-2">🎾</p>
          <p className="text-gray-600">Analysis not found or still processing.</p>
          <Link href="/" className="mt-4 inline-block text-green-600 font-medium hover:underline">
            Analyze your own game
          </Link>
        </div>
      </div>
    );
  }

  const playerResults = analysis.player_results || {};
  const positions = [
    { id: 'near-left',  label: 'Player 1', sub: 'Near Left' },
    { id: 'near-right', label: 'Player 2', sub: 'Near Right' },
    { id: 'far-left',   label: 'Player 3', sub: 'Far Left' },
    { id: 'far-right',  label: 'Player 4', sub: 'Far Right' },
  ];

  function skillLevel(playerAnalysis) {
    if (!playerAnalysis) return null;
    const shot = playerAnalysis.shot_quality?.overall ?? 5;
    const foot = playerAnalysis.footwork?.score ?? 5;
    const pos = playerAnalysis.positioning?.score ?? 5;
    const avg = (shot + foot + pos) / 3;
    if (avg >= 8) return { label: 'Advanced', color: '#f97316', bg: '#fff7ed' };
    if (avg >= 6) return { label: 'Intermediate', color: '#16a34a', bg: '#f0fdf4' };
    if (avg >= 4) return { label: 'Recreational', color: '#3b82f6', bg: '#eff6ff' };
    return { label: 'Beginner', color: '#6b7280', bg: '#f9fafb' };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-green-700">PickleballVideoIQ</span>
          </div>
          {isLoggedIn ? (
            <Link href="/" className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700">
              Analyze My Game
            </Link>
          ) : (
            <Link href={"/login?redirect=/share/" + id} className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700">
              Sign Up Free
            </Link>
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
            const playerAnalysis = data?.analysis;
            const strengths = playerAnalysis?.strengths || [];
            const weaknesses = playerAnalysis?.weaknesses || [];
            const tips = data?.tips || [];
            const skill = skillLevel(playerAnalysis);

            if (!data) return null;

            return (
              <div key={pos.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="mb-3">
                  <p className="text-sm font-bold text-gray-800">{pos.label}</p>
                  <p className="text-xs text-gray-500">{pos.sub}</p>
                  {skill && (
                    <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: skill.color, background: skill.bg }}>
                      {skill.label}
                    </span>
                  )}
                </div>

                {strengths.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-green-800 mb-1">Strengths</p>
                    {strengths.slice(0,2).map((s, i) => (
                      <p key={i} className="text-xs text-green-700">- {s}</p>
                    ))}
                  </div>
                )}

                {weaknesses.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-red-800 mb-1">Needs Work</p>
                    {weaknesses.slice(0,2).map((w, i) => (
                      <p key={i} className="text-xs text-red-700">- {w}</p>
                    ))}
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
                    <Link href={"/login?redirect=/share/" + id} className="inline-block text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700">
                      Unlock Free
                    </Link>
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
            <Link href={"/login?redirect=/share/" + id} className="inline-block bg-white text-green-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-50">
              Sign Up Free
            </Link>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">Analyzed by PickleballVideoIQ</p>
      </main>
    </div>
  );
}