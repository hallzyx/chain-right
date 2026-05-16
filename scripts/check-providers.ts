import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import "dotenv/config";

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const broker = await createZGComputeNetworkBroker(wallet);
  
  const services = await broker.inference.listService();
  
  console.log("=== ALL SERVICES ===");
  for (const s of services) {
    console.log(`\nProvider: ${s[0]}`);
    console.log(`Type: ${s[1]}`);
    console.log(`URL: ${s[2]}`);
    console.log(`Model: ${s[6]}`);
    console.log(`TEE: ${s[10]}`);
  }
  
  console.log("\n=== IMAGE-EDITING ONLY ===");
  const edits = services.filter((s: any) => s[1] === "image-editing");
  console.log(`Found ${edits.length} image-editing providers`);
  for (const s of edits) {
    console.log(`\nProvider: ${s[0]}`);
    console.log(`URL: ${s[2]}`);
    console.log(`Model: ${s[6]}`);
  }
}

main().catch(console.error);
