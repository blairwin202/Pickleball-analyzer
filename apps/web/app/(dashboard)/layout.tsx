import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎾</span>
            <span className="text-xl font-bold text-green-700">PickleballVideoIQ</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-green-700">Analyze</Link>
            <Link href="/history" className="text-sm text-gray-600 hover:text-green-700">History</Link>
            <form action="/api/auth/signout" method="post">
              <button className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
