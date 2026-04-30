import { Indexer, ZgFile } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import "dotenv/config";

/**
 * Diagnóstico de upload de storage en 0G.
 *
 * Crea un archivo chico temporal, arma submission y prueba estimateGas
 * para aislar causa de reverts en submit().
 */
async function main() {
  const rpc = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://evmrpc-testnet.0g.ai";
  const indexerUrl =
    process.env.STORAGE_INDEXER ||
    process.env.NEXT_PUBLIC_STORAGE_INDEXER ||
    "https://indexer-storage-testnet-turbo.0g.ai";
  const pk = process.env.PRIVATE_KEY;

  if (!pk) throw new Error("PRIVATE_KEY missing");

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const indexer = new Indexer(indexerUrl);

  console.log("RPC:", rpc);
  console.log("Indexer:", indexerUrl);
  console.log("Wallet:", wallet.address);
  console.log("Balance:", ethers.formatEther(await provider.getBalance(wallet.address)));

  const [nodes, nodesErr] = await indexer.selectNodes(1);
  if (nodesErr) throw nodesErr;

  const status = await nodes[0].getStatus();
  const flowAddress = status?.networkIdentity?.flowAddress;
  if (!flowAddress) throw new Error("flowAddress missing from node status");

  console.log("Flow:", flowAddress);

  // ABI mínima relevante
  const flowAbi = [
    "function market() view returns (address)",
    "function submit((bytes32,uint64,uint64,bytes,bytes32[],uint64,uint64), uint256, bytes) payable",
  ];
  const marketAbi = ["function pricePerSector() view returns (uint256)"];

  const flow = new ethers.Contract(flowAddress, flowAbi, wallet);
  const marketAddress = await flow.market();
  const market = new ethers.Contract(marketAddress, marketAbi, provider);
  const pricePerSector: bigint = await market.pricePerSector();

  console.log("Market:", marketAddress);
  console.log("pricePerSector:", pricePerSector.toString());

  // Crear archivo mínimo
  const tempPath = path.join(os.tmpdir(), `chainright-debug-${Date.now()}.txt`);
  await fs.writeFile(tempPath, Buffer.from("chainright-debug-upload", "utf8"));

  let file: ZgFile | null = null;
  try {
    file = await ZgFile.fromFilePath(tempPath);
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr || !tree) throw treeErr || new Error("No merkle tree");

    const rootHash = tree.rootHash();
    console.log("rootHash:", rootHash);
    console.log("fileSize:", file.size());
    console.log("numSegments:", file.numSegments());
    console.log("numChunks:", file.numChunks());

    const [submissionRaw, submissionErr] = await file.createSubmission("0x");
    if (submissionErr || !submissionRaw) throw submissionErr || new Error("No submission");

    const submission =
      (submissionRaw as any).data && (submissionRaw as any).submitter !== undefined
        ? (submissionRaw as any)
        : { data: submissionRaw, submitter: "0x0000000000000000000000000000000000000000" };

    console.log("submission keys:", Object.keys(submission));
    console.log("submission raw:", submission);

    let sectors = 0n;
    for (const n of submission.data.nodes || []) {
      sectors += 1n << BigInt(n.height.toString());
    }
    const fee = sectors * pricePerSector;

    console.log("submission.nodes.length:", String((submission.data.nodes || []).length));
    console.log("sectors:", sectors.toString());
    console.log("fee (wei):", fee.toString());

    try {
      const gas = await flow.submit.estimateGas(submission.data, { value: fee });
      console.log("estimateGas OK:", gas.toString());
    } catch (e: any) {
      console.log("estimateGas FAILED:", e?.message || e);
    }
  } finally {
    if (file) await file.close();
    await fs.unlink(tempPath).catch(() => {});
  }
}

main().catch((e) => {
  console.error("DEBUG STORAGE ERROR:", e?.message || e);
  process.exit(1);
});
