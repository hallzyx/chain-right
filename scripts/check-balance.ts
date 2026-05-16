import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import "dotenv/config";

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const broker = await createZGComputeNetworkBroker(wallet);
  
  // Wallet on-chain balance
  const chainBalance = await provider.getBalance(wallet.address);
  console.log("=== WALLET ON-CHAIN ===");
  console.log(`Address: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(chainBalance)} 0G`);
  
  // Ledger main balance
  try {
    const ledger = await broker.ledger.getLedger();
    console.log("\n=== LEDGER MAIN ===");
    console.log(`Total balance: ${ethers.formatEther(ledger[1])} 0G`);
    console.log(`Available: ${ethers.formatEther(ledger[2])} 0G`);
    
    // Sub-accounts
    console.log("\n=== SUB-ACCOUNTS ===");
    console.log(`Inference locks: ${JSON.stringify(ledger[3])}`);
    console.log(`Fine-tune locks: ${JSON.stringify(ledger[4])}`);
  } catch (e: any) {
    console.log("\n=== LEDGER ===");
    console.log(`No ledger account exists: ${e.message}`);
  }
  
  // Provider sub-account balance
  const targetProvider = "0x4b2a941929E39Adbea5316dDF2B9Bd8Ff3134389";
  try {
    const subAccount = await broker.ledger.getSubAccount(targetProvider, "inference");
    console.log("\n=== PROVIDER SUB-ACCOUNT (image-editing) ===");
    console.log(`Provider: ${targetProvider}`);
    console.log(`Locked balance: ${ethers.formatEther(subAccount[0])} 0G`);
  } catch (e: any) {
    console.log(`\nCould not get sub-account: ${e.message}`);
  }
}

main().catch(console.error);
