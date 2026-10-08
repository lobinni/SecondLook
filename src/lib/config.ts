/**
 * Central project configuration — the single source of truth for the network
 * and the deployed contract address.
 *
 * To point the whole product at a different contract:
 *   1. Easiest: run `node deploy/deploy.mjs`. It deploys a fresh court and
 *      rewrites `.env.local` with the new address.
 *   2. By hand: set NEXT_PUBLIC_CONTRACT_ADDRESS in `.env.local`, or edit the
 *      DEFAULT_CONTRACT_ADDRESS fallback below.
 *
 * Every page, panel, agent and script reads the address from here — nothing
 * else in the codebase hard-codes one.
 */

/** Fallback used only when NEXT_PUBLIC_CONTRACT_ADDRESS is not set. */
export const DEFAULT_CONTRACT_ADDRESS =
  "0x7557947cAD4785Fd7db9E4ea8A9b930D9e2881a1" as const;

const _envAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim();

export const CONTRACT_ADDRESS = (/^0x[0-9a-fA-F]{40}$/.test(_envAddress ?? "")
  ? _envAddress
  : DEFAULT_CONTRACT_ADDRESS) as `0x${string}`;

/** True once a real (non-zero) contract address is configured. */
export const CONTRACT_READY =
  !/^0x0{40}$/.test(CONTRACT_ADDRESS) &&
  /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS);

export const NETWORK = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 61999),
  name: "GenLayer Studionet",
  shortName: "Studionet",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "https://studio.genlayer.com/api",
  explorerUrl: (
    process.env.NEXT_PUBLIC_EXPLORER_URL ??
    "https://explorer-studio.genlayer.com"
  ).replace(/\/+$/, ""),
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 } as const,
} as const;

export const CHAIN_ID_HEX = `0x${NETWORK.chainId.toString(16)}`;

export function explorerTxUrl(hash: string): string {
  return `${NETWORK.explorerUrl}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${NETWORK.explorerUrl}/address/${address}`;
}

/** The internal unit of account handled by the court's own ledger. */
export const LEDGER = {
  symbol: "tUSD",
  name: "Studio test dollars",
  decimals: 6,
} as const;

/** Internal ledger amounts are integer micro-units: 1.00 tUSD = 1,000,000. */
export const MICROS = 1_000_000;
