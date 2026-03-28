// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function SharePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: analysis } = await supabase
    .from('analyses')
    .select('id, status, rating, rating_confidence, player_results, created_at')
    .eq('id', id)
    .single();

  if (!analysis || analysis.status !== 'complete') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-2">🎾</p>
          <p className="text-gray-600">Analysis not found or still processing.</p>
          <Link href="/" className="mt-4 inline-block text-green-600 font-medium hover:underline">
            Analyze your own game →
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

  function ratingLabel(r) {
    if (r < 2.5) return 'Beginner';
    if (r < 3.5) return 'Recreational';
    if (r < 4.5) return 'Intermediate';
    if (r < 5.5) return 'Advanced';
    return 'Pro';
  }

  function ratingColor(r) {
    if (r < 2.5) return '#6b7280';
    if (r < 3.5) return '#3b82f6';
    if (r < 4.5) return '#16a34a';
    if (r < 5.5) return '#f97316';
    return '#ef4444';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎾</span>
            <span className="text-xl font-bold text-green-700">PickleballVideoIQ</span>
          </div>
          <Link href="/" className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700">
            Analyze My Game
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Game Analysis Results</h1>
          <p className="text-gray-500 mt-1">Tap a player to see their results</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {positions.map((pos) => {
            const data = playerResults[pos.id];
            const rating = data?.analysis?.estimated_dupr;
            const strengths = data?.analysis?.strengths || [];
            const weaknesses = data?.analysis?.weaknesses || [];
            const tips = data?.tips || [];

            if (!data) return null;

            return (
              <div key={pos.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="text-center mb-3">
                  <p className="text-xs text-gray-500 font-medium">{pos.sub}</p>
                  {rating && (
                    <>
                      <div className="text-4xl font-bold mt-1" style={{ color: ratingColor(rating) }}>
                        {Number(rating).toFixed(2)}
                      </div>
                      <div className="text-sm font-semibold" style={{ color: ratingColor(rating) }}>
                        {ratingLabel(rating)}
                      </div>
                    </>
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

                <div className="rounded-xl bg-gray-100 p-3 text-center">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Pro Tips & Drills</p>
                  <p className="text-xs text-gray-400">Sign up free to unlock {tips.length} personalized drills</p>
                  <Link href="/" className="mt-2 inline-block text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700">
                    Unlock Free →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl bg-green-600 p-6 text-center text-white">
          <p className="text-lg font-bold mb-1">Want YOUR game analyzed?</p>
          <p className="text-sm opacity-80 mb-4">Upload a 30-second video and get your DUPR rating, strengths, weaknesses and personalized drills.</p>
          <Link href="/" className="inline-block bg-white text-green-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-50">
            Analyze My Game Free →
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400">Analyzed by PickleballVideoIQ 🎾</p>
      </main>
    </div>
  );
}