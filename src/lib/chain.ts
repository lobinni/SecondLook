/**
 * Chain access layer.
 *
 * Reads go through a shared GenLayer client pointed at the configured RPC.
 * Writes always go through the visitor's own EIP-1193 wallet (MetaMask or any
 * compatible injector): the wallet signs and sends every transaction itself,
 * and this app never sees a key.
 */
"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { CHAIN_ID_HEX, CONTRACT_ADDRESS, NETWORK } from "./config";
import type { Snapshot } from "./types";

export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

const genlayerChain = {
  ...studionet,
  id: NETWORK.chainId,
  rpcUrls: { default: { http: [NETWORK.rpcUrl] } },
  blockExplorers: { default: { name: "Explorer", url: NETWORK.explorerUrl } },
};

/** Shared read client — no account, no wallet, never signs anything. */
export const readClient = createClient({ chain: genlayerChain });

function parseJson<T>(raw: unknown, what: string): T {
  const text = typeof raw === "string" ? raw : String(raw);
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(`Could not parse ${what} from the contract: ${(err as Error).message}`);
  }
}

/** The one-call read the whole app polls. */
export async function readSnapshot(addresses: string[]): Promise<Snapshot> {
  const raw = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_snapshot",
    args: [addresses.join(",")],
  });
  return parseJson<Snapshot>(raw, "the court snapshot");
}

export function hasWallet(): boolean {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
}

/** Connected accounts, without prompting. */
export async function currentAccounts(): Promise<string[]> {
  if (!hasWallet()) return [];
  try {
    return (await window.ethereum!.request({ method: "eth_accounts" })) as string[];
  } catch {
    return [];
  }
}

export async function currentChainId(): Promise<number | null> {
  if (!hasWallet()) return null;
  try {
    const hex = (await window.ethereum!.request({ method: "eth_chainId" })) as string;
    return parseInt(hex, 16);
  } catch {
    return null;
  }
}

/** Prompt the wallet to connect and return the first account. */
export async function connectWallet(): Promise<string> {
  if (!hasWallet()) {
    throw new Error("No browser wallet found. Install MetaMask (or any EIP-1193 wallet) and reload.");
  }
  const accounts = (await window.ethereum!.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts || accounts.length === 0) throw new Error("The wallet did not share an account.");
  return accounts[0];
}

/** Add (if needed) and switch the wallet to the configured network. */
export async function ensureNetwork(): Promise<void> {
  if (!hasWallet()) throw new Error("No browser wallet found.");
  try {
    await window.ethereum!.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 4902 || code === -32603) {
      await window.ethereum!.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: NETWORK.name,
            rpcUrls: [NETWORK.rpcUrl],
            nativeCurrency: NETWORK.nativeCurrency,
            blockExplorerUrls: [NETWORK.explorerUrl],
          },
        ],
      });
      return;
    }
    throw err;
  }
}

export type PendingStage = "signing" | "submitted" | "accepted" | "finalized";

/**
 * Send one write through the visitor's wallet and wait for acceptance.
 * Returns the transaction hash.
 */
export async function sendWrite(
  account: string,
  functionName: string,
  args: (string | number | bigint)[],
  onStage?: (stage: PendingStage, hash?: string) => void,
): Promise<string> {
  if (!hasWallet()) throw new Error("No browser wallet found.");
  const client = createClient({
    chain: genlayerChain,
    provider: window.ethereum as never,
    account: account as `0x${string}`,
  });
  onStage?.("signing");
  const hash = String(
    await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
      value: BigInt(0),
    }),
  ) as `0x${string}`;
  onStage?.("submitted", hash);
  // Wait for acceptance; FINALIZED would also include appeals against the
  // transaction itself, which a demo flow should not sit through.
  await client.waitForTransactionReceipt({
    hash: hash as never,
    status: TransactionStatus.ACCEPTED,
    retries: 200,
    interval: 3000,
  });
  onStage?.("accepted", hash);
  return hash;
}

/** Human-readable message out of any thrown value. */
export function describeError(err: unknown): string {
  const anyErr = err as { shortMessage?: string; message?: string; cause?: { message?: string } };
  const msg = anyErr?.shortMessage || anyErr?.cause?.message || anyErr?.message || String(err);
  const m = /EXPECTED: (.+?)(?:"|\\n|$)/.exec(msg);
  if (m) return m[1];
  if (/user rejected|User denied|ACTION_REJECTED/i.test(msg)) return "The wallet request was cancelled.";
  if (/insufficient funds/i.test(msg)) return "The wallet reports insufficient funds for the network fee.";
  return msg.length > 220 ? msg.slice(0, 220) + "…" : msg;
}

export { NETWORK, CONTRACT_ADDRESS };
export const EXPLORER = NETWORK.explorerUrl;
