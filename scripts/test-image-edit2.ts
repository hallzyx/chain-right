import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import "dotenv/config";

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const broker = await createZGComputeNetworkBroker(wallet);
  
  const targetProvider = "0x4b2a941929E39Adbea5316dDF2B9Bd8Ff3134389";
  const { endpoint, model } = await broker.inference.getServiceMetadata(targetProvider);
  
  // Test: does /images/generations work on THIS provider?
  const body = JSON.stringify({
    model: model || "qwen/qwen-image-edit-2511",
    prompt: "a red circle",
    n: 1,
    size: "256x256",
    response_format: "b64_json",
  });
  
  console.log("Testing /images/generations on image-editing provider...");
  console.log("Endpoint:", endpoint);
  console.log("Model:", model);
  
  const headers = await broker.inference.getRequestHeaders(targetProvider, body);
  
  const resp = await fetch(`${endpoint}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body,
  });
  
  console.log("Status:", resp.status);
  const text = await resp.text();
  console.log("Response:", text.substring(0, 500));
}

main().catch(console.error);
