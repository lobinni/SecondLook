"use client";

import { ArrowRight, FileSearch, Gavel, Landmark, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCourt } from "@/lib/store";
import { fmtAmount } from "@/lib/money";

interface Entry {
  id: string;
  group: "Spends" | "Rulings" | "Pages" | "Actions";
  title: string;
  hint?: string;
  run: () => void;
}

/** ⌘K / Ctrl-K: fuzzy-jump to spends, rulings, pages and actions. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const { snapshot, wallet } = useCourt();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setIndex(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = [];
    const go = (href: string) => () => {
      router.push(href);
      setOpen(false);
    };
    list.push({ id: "a-new", group: "Actions", title: "Open a new spend", hint: "Lock amount + bond behind a mandate", run: go("/console/spends?new=1") });
    if (!wallet.account) list.push({ id: "a-connect", group: "Actions", title: "Connect wallet", hint: "Participate from your own address", run: () => { wallet.connect().catch(() => {}); setOpen(false); } });
    list.push({ id: "a-overview", group: "Pages", title: "Overview", hint: "What to do next", run: go("/console") });
    list.push({ id: "a-spends", group: "Pages", title: "Spend lists", hint: "Opportunities, disputes, won, lost", run: go("/console/spends") });
    list.push({ id: "a-analysis", group: "Pages", title: "Panel analysis", hint: "Every ruling", run: go("/console/analysis") });
    list.push({ id: "a-signals", group: "Pages", title: "Risk signals", run: go("/console/signals") });
    list.push({ id: "a-evidence", group: "Pages", title: "Evidence pages", run: go("/console/evidence") });
    list.push({ id: "a-analytics", group: "Pages", title: "Analytics", run: go("/console/analytics") });
    list.push({ id: "a-tx", group: "Pages", title: "Transactions", run: go("/console/transactions") });
    list.push({ id: "a-settings", group: "Pages", title: "Settings", run: go("/console/settings") });
    list.push({ id: "a-help", group: "Pages", title: "Help & flow", run: go("/console/help") });
    for (const s of snapshot?.spends ?? []) {
      list.push({
        id: `s-${s.id}`,
        group: "Spends",
        title: `Spend #${s.id} · ${fmtAmount(s.amount)} tUSD · ${s.status}`,
        hint: s.mandate.slice(0, 90),
        run: go(`/console/spends/${s.id}`),
      });
    }
    for (const c of snapshot?.cases ?? []) {
      list.push({
        id: `c-${c.id}`,
        group: "Rulings",
        title: `Case #${c.id} · ${c.label}${c.overturned ? " · overturned" : ""}`,
        hint: c.reason.slice(0, 90),
        run: go("/console/analysis"),
      });
    }
    return list;
  }, [snapshot, router, wallet]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries.slice(0, 14);
    return entries
      .filter((e) => `${e.title} ${e.hint ?? ""} ${e.group}`.toLowerCase().includes(q))
      .slice(0, 14);
  }, [entries, query]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && filtered[index]) { e.preventDefault(); filtered[index].run(); }
    },
    [filtered, index],
  );

  if (!open) return null;

  const icons = { Spends: <Landmark className="w-4 h-4" />, Rulings: <Gavel className="w-4 h-4" />, Pages: <FileSearch className="w-4 h-4" />, Actions: <Plus className="w-4 h-4" /> };

  return (
    <div className="fixed inset-0 z-[90] backdrop flex items-start justify-center pt-[12vh] px-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl card shadow-lift rise-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 border-b hairline">
          <Search className="w-4 h-4 text-fog shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIndex(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search spends, rulings, pages, actions…"
            className="w-full py-4 text-sm font-semibold bg-transparent outline-none placeholder:text-ash"
          />
          <kbd className="label-micro text-fog border hairline px-2 py-1">ESC</kbd>
        </div>
        <div className="max-h-[46vh] overflow-y-auto scroll-thin py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-fog font-medium">Nothing matches “{query}”.</div>
          )}
          {filtered.map((e, i) => (
            <button
              key={e.id}
              type="button"
              onClick={e.run}
              onMouseEnter={() => setIndex(i)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i === index ? "bg-mist" : ""}`}
            >
              <span className="text-pine shrink-0">{icons[e.group]}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold truncate">{e.title}</span>
                {e.hint && <span className="block text-xs text-fog truncate font-medium">{e.hint}</span>}
              </span>
              <span className="label-micro text-ash shrink-0">{e.group}</span>
              <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${i === index ? "text-pine" : "text-ash"}`} />
            </button>
          ))}
        </div>
        <div className="px-4 py-2.5 border-t hairline flex items-center gap-4 text-[11px] text-fog font-semibold">
          <span>↑↓ move</span><span>↵ open</span><span className="ml-auto">⌘K anywhere</span>
        </div>
      </div>
    </div>
  );
}
