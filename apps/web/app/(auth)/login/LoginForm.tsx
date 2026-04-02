"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export function LoginForm({ redirect = "/" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) { setError(signUpError.message); setLoading(false); return; }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError("Account created! Please check your email to confirm, then sign in.");
        setLoading(false);
        return;
      }
      router.push(redirect);
      router.refresh();
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) { setError(signInError.message); setLoading(false); return; }
    router.push(redirect);
    router.refresh();
  };
  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "..." : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        {mode === "login" ? "No account?" : "Already have an account?"}{" "}
        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="font-medium text-green-600 hover:underline"
        >
          {mode === "login" ? "Sign up free" : "Sign in"}
        </button>
      </p>
    </div>
  );
}