"use client";

import {
  Activity,
  FileSearch,
  Gavel,
  HelpCircle,
  Landmark,
  LayoutGrid,
  LineChart,
  Plus,
  Radar,
  RefreshCw,
  Receipt,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useCourt } from "@/lib/store";
import { CONTRACT_READY } from "@/lib/config";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";
import { NewSpendModal } from "./NewSpend";
import { LiveDot } from "./ui";
import { WalletButton } from "./WalletButton";

const NAV = [
  { href: "/console", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/console/spends", label: "Spends", icon: Landmark },
  { href: "/console/analysis", label: "Panel analysis", icon: Gavel },
  { href: "/console/signals", label: "Risk signals", icon: Radar },
  { href: "/console/evidence", label: "Evidence", icon: FileSearch },
  { href: "/console/transactions", label: "Transactions", icon: Receipt },
  { href: "/console/analytics", label: "Analytics", icon: LineChart },
] as const;

const NAV_BOTTOM = [
  { href: "/console/activity", label: "Activity", icon: Activity },
  { href: "/console/settings", label: "Settings", icon: Settings },
  { href: "/console/help", label: "Help", icon: HelpCircle },
] as const;

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { snapshot, refresh, updatedAt, now, loading } = useCourt();
  const [newOpen, setNewOpen] = useState(false);

  // ?new=1 opens the new-spend modal (used by landing links and the palette)
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("new=1")) {
      setNewOpen(true);
      router.replace(pathname);
    }
  }, [pathname, router]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const staleSec = updatedAt ? now - updatedAt : null;

  return (
    <div className="min-h-screen grid-paper lg:pl-60">
      {/* ── sidebar (desktop) ─────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 border-r hairline bg-paper z-40">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b hairline">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-extrabold title-tight">SecondLook</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto scroll-thin py-4 px-3">
          <div className="label-micro text-ash px-3 mb-2">Court</div>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 mb-0.5 text-sm font-bold border-l-[3px] border-transparent transition-colors",
                isActive(n.href, "exact" in n && n.exact)
                  ? "bg-mist text-pine !border-pine"
                  : "text-fog hover:text-ink hover:bg-meadow/60",
              )}
            >
              <n.icon className="w-4 h-4" />
              {n.label}
              {n.href === "/console/spends" && snapshot && (
                <span className="ml-auto text-[11px] font-extrabold text-ash">{snapshot.stats.spend_count}</span>
              )}
              {n.href === "/console/analysis" && snapshot && snapshot.stats.case_count > 0 && (
                <span className="ml-auto text-[11px] font-extrabold text-ash">{snapshot.stats.case_count}</span>
              )}
            </Link>
          ))}
          <div className="label-micro text-ash px-3 mt-6 mb-2">You</div>
          {NAV_BOTTOM.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 mb-0.5 text-sm font-bold border-l-[3px] border-transparent transition-colors",
                isActive(n.href) ? "bg-mist text-pine !border-pine" : "text-fog hover:text-ink hover:bg-meadow/60",
              )}
            >
              <n.icon className="w-4 h-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t hairline">
          <button type="button" onClick={() => setNewOpen(true)} className="btn btn-mint text-xs w-full">
            <Plus className="w-4 h-4" /> New spend
          </button>
        </div>
      </aside>

      {/* ── topbar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-16 border-b hairline bg-sage/90 backdrop-blur flex items-center gap-3 px-4 md:px-7">
        <Link href="/" className="lg:hidden flex items-center gap-2">
          <Logo size={26} />
        </Link>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
          className="hidden md:flex items-center gap-2.5 border hairline bg-paper px-3.5 py-2 text-xs font-bold text-fog hover:border-ink/30 transition-colors w-64"
        >
          <Search className="w-3.5 h-3.5" /> Search spends, rulings…
          <kbd className="ml-auto label-micro text-ash border hairline px-1.5 py-0.5">⌘K</kbd>
        </button>
        <div className="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refresh()}
            className="btn btn-ghost !px-2.5 !py-2"
            title={staleSec !== null ? `Updated ${staleSec}s ago` : "Refresh"}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <span className="hidden md:inline-flex chip !py-2">
            <LiveDot /> Live
          </span>
          <button type="button" onClick={() => setNewOpen(true)} className="btn btn-mint text-xs lg:hidden">
            <Plus className="w-4 h-4" />
          </button>
          <WalletButton compact />
        </div>
      </header>

      {/* ── content ───────────────────────────────────────── */}
      <main className="px-4 md:px-7 py-7 pb-28 lg:pb-12 max-w-[1220px]">
        {!CONTRACT_READY ? <NotConfigured /> : children}
      </main>

      {/* ── bottom nav (mobile) ───────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t hairline bg-paper flex">
        {[
          NAV[0], NAV[1], NAV[2], NAV[4],
        ].map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-extrabold uppercase tracking-wider",
              isActive(n.href, "exact" in n && (n as { exact?: boolean }).exact) ? "text-pine" : "text-ash",
            )}
          >
            <n.icon className="w-5 h-5" />
            {n.label.split(" ")[0]}
          </Link>
        ))}
        <Link
          href="/console/settings"
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-extrabold uppercase tracking-wider",
            pathname === "/console/settings" ? "text-pine" : "text-ash",
          )}
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
      </nav>

      {newOpen && <NewSpendModal onClose={() => setNewOpen(false)} />}
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="card px-8 py-16 text-center max-w-xl mx-auto mt-10">
      <div className="mx-auto mb-5 w-12 h-12 border border-ink bg-mist shadow-edge-mint" />
      <h2 className="text-2xl font-extrabold title-tight">No court is linked yet</h2>
      <p className="text-fog text-sm font-medium mt-3 leading-relaxed">
        This console reads everything from a single deployed court contract on Studionet.
        Deploy your own with the included deploy script — it links the address automatically —
        or paste an existing address into the project configuration and reload.
      </p>
      <div className="mt-6 chip mx-auto">One address · one config entry · zero other edits</div>
    </div>
  );
}

export default function ConsoleShell({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
