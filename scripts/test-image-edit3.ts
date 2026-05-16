import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import "dotenv/config";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const broker = await createZGComputeNetworkBroker(wallet);
  
  const targetProvider = "0x4b2a941929E39Adbea5316dDF2B9Bd8Ff3134389";
  const { endpoint, model } = await broker.inference.getServiceMetadata(targetProvider);
  
  // Create a tiny PNG file
  const tinyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
  const tmpFile = path.join(os.tmpdir(), "test-tiny.png");
  fs.writeFileSync(tmpFile, Buffer.from(tinyPngBase64, "base64"));
  
  // Test multipart/form-data
  const formData = new FormData();
  formData.append("model", model || "qwen/qwen-image-edit-2511");
  formData.append("prompt", "make it blue");
  formData.append("image", new File([fs.readFileSync(tmpFile)], "test.png", { type: "image/png" }));
  
  console.log("Testing multipart/form-data...");
  console.log("Endpoint:", endpoint);
  console.log("Model:", model);
  
  // For multipart, we need to sign the empty body or a specific string
  const headers = await broker.inference.getRequestHeaders(targetProvider, "");
  
  const resp = await fetch(`${endpoint}/images/edits`, {
    method: "POST",
    headers: { ...headers },  // NO Content-Type - let fetch set it with boundary
    body: formData,
  });
  
  console.log("Status:", resp.status);
  const text = await resp.text();
  console.log("Response:", text.substring(0, 500));
  
  // Cleanup
  fs.unlinkSync(tmpFile);
}

main().catch(console.error);
