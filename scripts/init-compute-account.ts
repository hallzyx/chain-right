/**
 * Script para crear/inicializar la cuenta principal en 0G Compute Network.
 * Requiere tener 0G en la wallet para el depósito inicial.
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

  console.log("Wallet:", wallet.address);

  // Check on-chain balance
  const balance = await provider.getBalance(wallet.address);
  console.log("On-chain balance:", ethers.formatEther(balance), "0G");

  if (balance === 0n) {
    console.error("\n❌ Wallet has no 0G balance. Fund it from the faucet first:");
    console.error("   https://faucet.0g.ai");
    process.exit(1);
  }

  // Try to create account / deposit
  console.log("\n🏦 Attempting to create account with 0.1 0G deposit (minimum)...");
  try {
    // depositFund should create the account if it doesn't exist
    // MINIMUM deposit is 0.1 0G on testnet
    const tx = await broker.ledger.depositFund(0.1);
    console.log("  Deposit transaction:", tx);
    console.log("  ✅ Account created successfully!");
  } catch (err: any) {
    console.error("  ❌ Failed:", err.message);
    console.error("  Full error:", JSON.stringify(err, null, 2));
  }

  // Verify account exists
  console.log("\n📊 Verifying account...");
  try {
    const ledger = await broker.ledger.getLedger();
    console.log("  Total balance:", ethers.formatEther(ledger[1] as bigint), "0G");
    console.log("  Available balance:", ethers.formatEther(ledger[2] as bigint), "0G");
    console.log("  ✅ Account verified!");
  } catch (err: any) {
    console.error("  ❌ Still doesn't exist:", err.message);
  }
}

main().catch(console.error);
