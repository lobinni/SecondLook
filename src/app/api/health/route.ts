import { CONTRACT_ADDRESS, CONTRACT_READY, NETWORK } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Liveness probe. The dApp itself is stateless — the browser talks to the
 * court contract on-chain and there is no database to ping.
 */
export async function GET() {
  return Response.json({
    ok: true,
    service: "secondlook",
    network: { name: NETWORK.name, chainId: NETWORK.chainId },
    contract: CONTRACT_ADDRESS,
    contractConfigured: CONTRACT_READY,
  });
}
