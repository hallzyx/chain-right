import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import "dotenv/config";

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const broker = await createZGComputeNetworkBroker(wallet);
  
  const targetProvider = "0x4b2a941929E39Adbea5316dDF2B9Bd8Ff3134389";
  const { endpoint, model } = await broker.inference.getServiceMetadata(targetProvider);
  
  console.log("Endpoint:", endpoint);
  console.log("Model:", model);
  
  // Create a tiny 1x1 red pixel PNG as base64
  const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
  
  // Test 1: flat body (same as text-to-image pattern)
  const body1 = JSON.stringify({
    model: model || "qwen/qwen-image-edit-2511",
    image: tinyPng,
    prompt: "make it blue",
  });
  
  console.log("\n--- Test 1: flat body ---");
  console.log("Body size:", body1.length);
  
  const headers1 = await broker.inference.getRequestHeaders(targetProvider, body1);
  console.log("Headers:", Object.keys(headers1));
  
  const resp1 = await fetch(`${endpoint}/images/edits`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers1 },
    body: body1,
  });
  
  console.log("Status:", resp1.status);
  const text1 = await resp1.text();
  console.log("Response:", text1.substring(0, 500));
  
  // Test 2: with size and response_format like text-to-image
  const body2 = JSON.stringify({
    model: model || "qwen/qwen-image-edit-2511",
    image: tinyPng,
    prompt: "make it blue",
    n: 1,
    size: "512x512",
    response_format: "b64_json",
  });
  
  console.log("\n--- Test 2: with size + response_format ---");
  const headers2 = await broker.inference.getRequestHeaders(targetProvider, body2);
  
  const resp2 = await fetch(`${endpoint}/images/edits`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers2 },
    body: body2,
  });
  
  console.log("Status:", resp2.status);
  const text2 = await resp2.text();
  console.log("Response:", text2.substring(0, 500));
}

main().catch(console.error);
