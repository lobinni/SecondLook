#!/usr/bin/env node
/**
 * Deploy SecondLookCourt to GenLayer Studionet and write .env.local.
 *
 *   npm install
 *   node deploy/deploy.mjs [--tick-seconds 60] [--rpc https://studio.genlayer.com/api]
 *                          [--chain-id 61999] [--explorer https://explorer-studio.genlayer.com]
 *
 * Studionet is gasless, so the throwaway deployer key needs no funds. The
 * contract has no owner, so the deployer holds no privileges afterwards and
 * its key is discarded immediately. The printed address is the ONLY thing
 * that changes between deployments: the script rewrites .env.local, which is
 * the single place the whole stack reads the address from.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const { createClient, createAccount, generatePrivateKey } = await import(
  pathToFileURL(require.resolve("genlayer-js"))
);
const { studionet, localnet } = await import(pathToFileURL(require.resolve("genlayer-js/chains")));
const { TransactionStatus } = await import(pathToFileURL(require.resolve("genlayer-js/types")));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const tickSeconds = Number(arg("tick-seconds", "60"));
const chainId = Number(arg("chain-id", "61999"));
const chain = chainId === 61127 ? localnet : studionet;
const rpc = arg("rpc", chain.rpcUrls.default.http[0]);
const explorer = arg("explorer", "https://explorer-studio.genlayer.com");

if (!Number.isInteger(tickSeconds) || tickSeconds < 1 || tickSeconds > 86400) {
  throw new Error("--tick-seconds must be an integer between 1 and 86400");
}

const code = readFileSync(join(root, "contracts", "secondlook.py"), "utf8");
const account = createAccount(generatePrivateKey());
const client = createClient({
  chain: { ...chain, id: chainId, rpcUrls: { default: { http: [rpc] } } },
  account,
});

console.log(`Deploying SecondLookCourt (tick = ${tickSeconds}s, window = ${3 * tickSeconds}s) to ${rpc} …`);
const hash = await client.deployContract({ code, args: [tickSeconds] });
console.log(`deploy tx ${hash}`);
const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.ACCEPTED,
  retries: 160,
  interval: 3000,
});
const address = receipt?.data?.contract_address ?? receipt?.txDataDecoded?.contractAddress;
if (!address) {
  console.error(JSON.stringify(receipt, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2).slice(0, 4000));
  throw new Error("deployment receipt carried no contract address");
}
console.log(`SecondLookCourt deployed at ${address}`);
console.log(`explorer: ${explorer}/address/${address}`);

const env = [
  `# Written by deploy/deploy.mjs — the app reads the court address from here.`,
  `NEXT_PUBLIC_RPC_URL=${rpc}`,
  `NEXT_PUBLIC_CHAIN_ID=${chainId}`,
  `NEXT_PUBLIC_EXPLORER_URL=${explorer}`,
  `NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`,
  "",
].join("\n");
const out = join(root, ".env.local");
if (existsSync(out)) console.log(`(replacing ${out})`);
writeFileSync(out, env);
console.log(`wrote ${out}`);
console.log(`Restart the app (npm run dev / build) to read the new address.`);
