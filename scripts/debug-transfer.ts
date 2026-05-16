/**
 * Debug script: probar transferencia de fondos al provider de image-editing
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

  const targetProvider = "0x4b2a941929E39Adbea5316dDF2B9Bd8Ff3134389";

  console.log("Wallet:", wallet.address);
  console.log("Provider:", targetProvider);

  // Check main account balance
  console.log("\n📊 Checking main account balance...");
  const ledger = await broker.ledger.getLedger();
  console.log("  Total balance:", ethers.formatEther(ledger[1] as bigint), "0G");
  console.log("  Available balance:", ethers.formatEther(ledger[2] as bigint), "0G");

  // Try to transfer
  console.log("\n💸 Attempting to transfer 0.001 0G to provider...");
  try {
    const amount = ethers.parseEther("0.01");
    console.log("  Amount (wei):", amount.toString());
    
    const tx = await broker.ledger.transferFund(targetProvider, "inference", amount);
    console.log("  Transfer result:", tx);
    console.log("  ✅ Transfer successful!");
  } catch (err: any) {
    console.error("  ❌ Transfer failed:", err.message);
    console.error("  Full error:", err);
  }

  // Check balance again
  console.log("\n📊 Checking balance after transfer...");
  const ledger2 = await broker.ledger.getLedger();
  console.log("  Total balance:", ethers.formatEther(ledger2[1] as bigint), "0G");
  console.log("  Available balance:", ethers.formatEther(ledger2[2] as bigint), "0G");
}

main().catch(console.error);
