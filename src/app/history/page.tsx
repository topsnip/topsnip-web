export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search History — Topsnip",
  description: "Your recent AI topic searches on Topsnip.",
};

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock } from "lucide-react";
import { AuthNav } from "@/components/AuthNav";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/history");
  }

  const { data: history } = await supabase
    .from("user_searches")
    .select("id, query, query_slug, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen px-4 relative">
      <AuthNav />

      <div className="max-w-2xl mx-auto flex flex-col gap-8 pt-24 pb-10">
        <h1
          className="text-xl font-bold text-white"
          style={{
            fontFamily: "var(--font-heading), 'Instrument Serif', serif",
          }}
        >
          Search history
        </h1>

        {!history || history.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center flex flex-col items-center gap-3">
            <Clock size={24} style={{ color: "var(--ts-muted)" }} />
            <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
              No searches yet. Start by searching a topic.
            </p>
            <Link
              href="/feed"
              className="text-sm font-medium"
              style={{ color: "var(--ts-accent)" }}
            >
              Go to feed →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((item) => (
              <Link
                key={item.id}
                href={`/s/${item.query_slug}?q=${encodeURIComponent(item.query)}`}
                className="flex items-center justify-between rounded-xl border px-4 py-3 transition-all hover:border-[var(--ts-accent)] group"
                style={{
                  background: "var(--ts-surface)",
                  borderColor: "var(--border)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.03)",
                }}
              >
                <span className="text-sm font-medium text-white group-hover:text-[var(--ts-accent-2)] transition-colors">
                  {item.query}
                </span>
                <span
                  className="text-xs flex-shrink-0 ml-4"
                  style={{ color: "var(--ts-muted)" }}
                >
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
