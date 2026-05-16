import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import "dotenv/config";

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const broker = await createZGComputeNetworkBroker(wallet);
  
  const chatbotProvider = "0xa48f01287233509FD694a22Bf840225062E67836";
  const amount = 1.0; // 1.0 0G para crear la sub-cuenta
  
  console.log("Wallet:", wallet.address);
  console.log("Provider:", chatbotProvider);
  console.log("Amount:", amount, "0G");
  
  // Check ledger balance first
  try {
    const ledger = await broker.ledger.getLedger();
    const total = ethers.formatEther(ledger[1]);
    const available = ethers.formatEther(ledger[2]);
    console.log(`\nLedger total: ${total} 0G`);
    console.log(`Ledger available: ${available} 0G`);
    
    if (parseFloat(available) < amount) {
      console.log(`\n❌ Not enough balance. Need ${amount} 0G, have ${available} 0G`);
      console.log("Deposit more funds first: use the Deposit button in /create");
      return;
    }
  } catch (e: any) {
    console.log("Could not check ledger:", e.message);
  }
  
  console.log("\nTransferring...");
  await broker.ledger.transferFund(
    chatbotProvider,
    "inference",
    ethers.parseEther(amount.toString())
  );
  
  console.log(`✅ Transferred ${amount} 0G to chatbot provider`);
  console.log("Sub-account initialized. Agent should work now.");
}

main().catch(console.error);
