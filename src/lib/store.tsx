/**
 * CourtProvider — one shared snapshot, one wallet session, one activity log.
 *
 * The hosted RPC budget is small (a few dozen requests per minute per
 * client), so the whole app polls a single multi-read on a slow cadence and
 * refreshes it after every write.
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  connectWallet,
  currentAccounts,
  currentChainId,
  describeError,
  ensureNetwork,
  hasWallet,
  readSnapshot,
  sendWrite,
  type PendingStage,
} from "./chain";
import { CONTRACT_READY, NETWORK } from "./config";
import type { Snapshot } from "./types";

export interface ActivityItem {
  id: string;
  at: number; // unix seconds
  label: string;
  hash?: string;
  status: "pending" | "ok" | "error";
  detail?: string;
}

interface CourtState {
  snapshot: Snapshot | null;
  loading: boolean;
  error: string | null;
  updatedAt: number;
  now: number;
  refresh: () => Promise<void>;

  wallet: {
    available: boolean;
    account: string | null;
    chainOk: boolean;
    connecting: boolean;
    connect: () => Promise<void>;
    switchNetwork: () => Promise<void>;
    forget: () => void;
  };

  activity: ActivityItem[];
  /** Run a contract write through the connected wallet, with activity logging. */
  act: (label: string, fn: string, args: (string | number | bigint)[]) => Promise<string>;
  busy: string | null; // label of the in-flight action
  stage: { label: string; stage: PendingStage; hash?: string } | null;
}

const CourtCtx = createContext<CourtState | null>(null);

const POLL_MS = 18_000;
const ACTIVITY_KEY = "secondlook.activity.v1";

function loadActivity(): ActivityItem[] {
  try {
    if (typeof window === "undefined") return [];
    return JSON.parse(sessionStorage.getItem(ACTIVITY_KEY) ?? "[]") as ActivityItem[];
  } catch {
    return [];
  }
}

export function CourtProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const [account, setAccount] = useState<string | null>(null);
  const [chainOk, setChainOk] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [stage, setStage] = useState<CourtState["stage"]>(null);

  const accountRef = useRef<string | null>(null);
  accountRef.current = account;

  const refresh = useCallback(async () => {
    if (!CONTRACT_READY) {
      setLoading(false);
      setError("not-configured");
      return;
    }
    try {
      const addresses = accountRef.current ? [accountRef.current] : [];
      const snap = await readSnapshot(addresses);
      setSnapshot(snap);
      setError(null);
      setUpdatedAt(Math.floor(Date.now() / 1000));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // clock
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // initial + polling
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  // refresh whenever the tracked wallet changes
  useEffect(() => {
    refresh();
  }, [account, refresh]);

  // wallet discovery + listeners
  useEffect(() => {
    setActivity(loadActivity());
    if (!hasWallet()) return;
    currentAccounts().then((accs) => {
      if (accs[0]) setAccount(accs[0]);
    });
    currentChainId().then((id) => setChainOk(id === NETWORK.chainId));
    const eth = window.ethereum!;
    const onAccounts = (...args: unknown[]) => {
      const accs = args[0] as string[];
      setAccount(accs?.[0] ?? null);
    };
    const onChain = (...args: unknown[]) => {
      const hex = args[0] as string;
      setChainOk(parseInt(hex, 16) === NETWORK.chainId);
    };
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const persistActivity = useCallback((items: ActivityItem[]) => {
    setActivity(items);
    try {
      sessionStorage.setItem(ACTIVITY_KEY, JSON.stringify(items.slice(0, 60)));
    } catch {
      /* storage full or blocked — the in-memory list still works */
    }
  }, []);

  const logActivity = useCallback(
    (item: ActivityItem) => {
      persistActivity([item, ...activity].slice(0, 60));
    },
    [activity, persistActivity],
  );

  const patchActivity = useCallback(
    (id: string, patch: Partial<ActivityItem>) => {
      persistActivity(activity.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    },
    [activity, persistActivity],
  );

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const acc = await connectWallet();
      setAccount(acc);
      const id = await currentChainId();
      if (id !== NETWORK.chainId) {
        await ensureNetwork();
        setChainOk(true);
      } else {
        setChainOk(true);
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    await ensureNetwork();
    setChainOk(true);
  }, []);

  const forget = useCallback(() => setAccount(null), []);

  const act = useCallback(
    async (label: string, fn: string, args: (string | number | bigint)[]): Promise<string> => {
      const who = accountRef.current;
      if (!who) throw new Error("Connect your wallet first — participation happens from your own address.");
      if (!chainOk) {
        await ensureNetwork();
        setChainOk(true);
      }
      setBusy(label);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      try {
        const hash = await sendWrite(who, fn, args, (st, h) => setStage({ label, stage: st, hash: h }));
        logActivity({ id, at: Math.floor(Date.now() / 1000), label, hash, status: "ok" });
        await refresh();
        return hash;
      } catch (err) {
        const detail = describeError(err);
        logActivity({ id, at: Math.floor(Date.now() / 1000), label, status: "error", detail });
        throw new Error(detail);
      } finally {
        setBusy(null);
        setStage(null);
      }
    },
    [chainOk, logActivity, refresh],
  );

  // keep activity patcher warm for future use
  void patchActivity;

  const value = useMemo<CourtState>(
    () => ({
      snapshot,
      loading,
      error,
      updatedAt,
      now,
      refresh,
      wallet: {
        available: typeof window !== "undefined" && hasWallet(),
        account,
        chainOk,
        connecting,
        connect,
        switchNetwork,
        forget,
      },
      activity,
      act,
      busy,
      stage,
    }),
    [snapshot, loading, error, updatedAt, now, refresh, account, chainOk, connecting, connect, switchNetwork, forget, activity, act, busy, stage],
  );

  return <CourtCtx.Provider value={value}>{children}</CourtCtx.Provider>;
}

export function useCourt(): CourtState {
  const ctx = useContext(CourtCtx);
  if (!ctx) throw new Error("useCourt must be used inside CourtProvider");
  return ctx;
}
