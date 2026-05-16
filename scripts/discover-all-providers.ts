/**
 * Script para descubrir TODOS los providers registrados en 0G Compute Network
 * y ver sus service types reales.
 */
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { ethers } from "ethers";
import "dotenv/config";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://evmrpc-testnet.0g.ai";

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not configured");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const broker = await createZGComputeNetworkBroker(wallet);

  console.log("🔍 Descubriendo TODOS los servicios registrados...\n");

  const services = await broker.inference.listService();

  console.log(`Total services found: ${services.length}\n`);

  for (let i = 0; i < services.length; i++) {
    const s = services[i];
    console.log(`[${i}] Service #${i}:`);
    console.log(`  [0] address:     ${s[0]}`);
    console.log(`  [1] serviceType: ${s[1]}`);
    console.log(`  [2] url:         ${s[2]}`);
    console.log(`  [3]:             ${s[3]}`);
    console.log(`  [4]:             ${s[4]}`);
    console.log(`  [5]:             ${s[5]}`);
    console.log(`  [6] model:       ${s[6]}`);
    console.log(`  [7]:             ${s[7]}`);
    console.log(`  [8]:             ${s[8]}`);
    console.log(`  [9]:             ${s[9]}`);
    console.log(`  [10] teeVerified: ${s[10]}`);
    console.log("");
  }

  // Group by service type
  const byType: Record<string, typeof services> = {};
  for (const s of services) {
    const type = s[1] as string;
    if (!byType[type]) byType[type] = [];
    byType[type].push(s);
  }

  console.log("\n📊 Summary by service type:");
  for (const [type, svcs] of Object.entries(byType)) {
    console.log(`  ${type}: ${svcs.length} provider(s)`);
    for (const svc of svcs) {
      console.log(`    → ${svc[6]} (${svc[10] ? "TEE ✓" : "no TEE"})`);
    }
  }
}

main().catch(console.error);
