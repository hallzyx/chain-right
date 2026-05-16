import { ethers, Contract, InterfaceAbi, ContractTransactionResponse } from "ethers";
import "dotenv/config";

import type { Provenance, MintResult, VerificationResult } from "./types";
import { CHAINRIGHT_ABI } from "./abi/ChainRightERC721.abi";

// ============================================
// Wrapper para ChainRightERC721 Contract
// ============================================
//
// REGLAS OBLIGATORIAS (de AGENTS.md y CHAIN.md):
//
// 1. SIEMPRE usar ethers v6
//    ✅ ethers.JsonRpcProvider
//    ❌ NO ethers.providers.JsonRpcProvider (v5)
//
// 2. ✅ ethers.parseEther
//    ❌ NO ethers.utils.parseEther (v5)
//
// 3. ✅ contract.waitForDeployment()
//    ❌ NO contract.deployed() (v5)
//
// 4. ✅ await contract.getAddress()
//    ❌ NO contract.address (v5)
//
// 5. El contrato debe haber sido compilado con evmVersion: "cancun"
//
// ============================================

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://evmrpc-testnet.0g.ai";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

// ============================================
// Helpers
// ============================================

function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(RPC_URL);
}

/**
 * Para operaciones de lectura (no gas).
 */
function getReadContract(): Contract {
  if (!CONTRACT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS not configured in .env. Deploy the contract first.");
  }
  const provider = getProvider();
  return new Contract(CONTRACT_ADDRESS, CHAINRIGHT_ABI, provider);
}

/**
 * Para operaciones de escritura (necesita wallet con gas).
 */
function getWriteContract(signerOrPrivateKey?: ethers.Signer | string): Contract {
  if (!CONTRACT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS not configured");
  }

  let signer: ethers.Signer;

  if (typeof signerOrPrivateKey === "string") {
    // Es un private key string
    const provider = getProvider();
    signer = new ethers.Wallet(signerOrPrivateKey, provider);
  } else if (signerOrPrivateKey) {
    // Es un Signer
    signer = signerOrPrivateKey;
  } else {
    // Intentar usar PRIVATE_KEY del .env
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("You need a Signer or Private Key for write operations");
    }
    const provider = getProvider();
    signer = new ethers.Wallet(privateKey, provider);
  }

  return new Contract(CONTRACT_ADDRESS, CHAINRIGHT_ABI, signer);
}

// ============================================
// Funciones de Lectura
// ============================================

/**
 * Consulta el registro de procedencia por Merkle Root (v3).
 * Función principal para verificar autenticidad.
 * 
 * @param merkleRoot bytes32 como string hex (debe empezar con 0x)
 */
export async function getProvenance(merkleRoot: string): Promise<Provenance | null> {
  try {
    const contract = getReadContract();

    const normalizedRoot = merkleRoot.startsWith("0x") ? merkleRoot : `0x${merkleRoot}`;

    const result = await contract.getProvenance(normalizedRoot);

    // v3 devuelve 10 valores: [merkleRoot, merkleRootOriginal, zkResKey, prompt, model, sequenceNumber, parentTokenId, timestamp, creator, exists]
    const exists = result[9] as boolean;

    if (!exists) {
      return null;
    }

    return {
      merkleRoot: result[0] as string,
      merkleRootOriginal: result[1] as string,
      zkResKey: result[2] as string,
      prompt: result[3] as string,
      model: result[4] as string,
      sequenceNumber: result[5] as string,
      parentTokenId: result[6] as bigint,
      timestamp: result[7] as bigint,
      creator: result[8] as string,
      exists: true,
    };
  } catch (error: any) {
    console.error("Error querying provenance:", error.message);
    return null;
  }
}

/**
 * Consulta procedencia por Token ID (v3).
 */
export async function getProvenanceByToken(tokenId: bigint | number): Promise<Provenance | null> {
  try {
    const contract = getReadContract();
    const tokenIdBigInt = typeof tokenId === "number" ? BigInt(tokenId) : tokenId;

    const result = await contract.getProvenanceByToken(tokenIdBigInt);
    const exists = result[9] as boolean;

    if (!exists) {
      return null;
    }

    return {
      merkleRoot: result[0] as string,
      merkleRootOriginal: result[1] as string,
      zkResKey: result[2] as string,
      prompt: result[3] as string,
      model: result[4] as string,
      sequenceNumber: result[5] as string,
      parentTokenId: result[6] as bigint,
      timestamp: result[7] as bigint,
      creator: result[8] as string,
      exists: true,
    };
  } catch (error: any) {
    console.error("Error querying by token:", error.message);
    return null;
  }
}

/**
 * Verifica si una imagen (por su Merkle Root) está registrada.
 * 
 * @param merkleRoot Merkle Root calculado de la imagen
 * @returns VerificationResult con el resultado
 */
export async function verifyProvenance(merkleRoot: string): Promise<VerificationResult> {
  const provenance = await getProvenance(merkleRoot);

  if (provenance && provenance.exists) {
    return {
      verified: true,
      merkleRoot,
      provenance,
      message: "Authenticity confirmed. This image is registered on ChainRight. ",
    };
  }

  return {
    verified: false,
    merkleRoot,
    message: "No record found. This image was not registered on ChainRight.",
  };
}

/**
 * Busca el tokenId y transactionHash del mint a partir del Merkle Root.
 * Consulta los eventos ProvenanceMinted del contrato.
 */
export async function getTokenIdAndTxByMerkleRoot(
  merkleRoot: string
): Promise<{ tokenId: bigint; txHash: string } | null> {
  try {
    const contract = getReadContract();
    const filter = contract.filters.ProvenanceMinted(null, merkleRoot);
    const events = await contract.queryFilter(filter, 0, "latest");

    if (events.length === 0) return null;

    // Tomamos el evento más reciente (debería haber solo uno por merkleRoot)
    const event = events[events.length - 1];
    const tokenId = (event as ethers.EventLog).args[0] as bigint;
    const txHash = (event as ethers.EventLog).transactionHash;

    return { tokenId, txHash };
  } catch (error) {
    console.error("Error querying ProvenanceMinted events:", error);
    return null;
  }
}

/**
 * Obtiene la cantidad de obras de un creador.
 */
export async function getCreatorWorksCount(creator: string): Promise<number> {
  try {
    const contract = getReadContract();
    const count = await contract.creatorWorksCount(creator);
    return Number(count);
  } catch {
    return 0;
  }
}

// ============================================
// Funciones de Escritura
// ============================================

/**
 * Mintea un NFT con procedencia (backward compat → delega a v3).
 * Para Mode 2 (Generate with AI) y compatibilidad hacia atrás.
 * Internamente llama a mintProvenanceWithChain con valores por defecto.
 */
export async function mintWithProvenance(
  merkleRoot: string,
  zkResKey: string,
  prompt: string,
  model: string,
  sequenceNumber: string,
  metadataUri: string,
  signerOrPrivateKey?: ethers.Signer | string
): Promise<MintResult> {
  // Delegar a v3 con merkleRootOriginal = 0x0 y parentTokenId = 0
  return mintProvenanceWithChain(
    merkleRoot,
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    zkResKey,
    prompt,
    model,
    sequenceNumber,
    BigInt(0),
    signerOrPrivateKey
  );
}

/**
 * Mintea un NFT con procedencia completa (v3).
 *
 * Para obras ORIGINALES (sin IA):
 *   merkleRootOriginal = ""  (se envía como bytes32(0) al contrato)
 *   parentTokenId      = 0
 *   zkResKey           = ""
 *   prompt             = ""
 *   model              = "none"
 *
 * Para obras EDITADAS CON IA (Mode 2):
 *   merkleRootOriginal = hash de la obra original
 *   parentTokenId      = Token ID de la obra original
 *   zkResKey           = ZG-Res-Key de la inferencia
 *   prompt             = prompt de edición
 *   model              = modelo de IA (ej: "qwen-image-edit-2511")
 */
export async function mintProvenanceWithChain(
  merkleRoot: string,
  merkleRootOriginal: string,
  zkResKey: string,
  prompt: string,
  model: string,
  sequenceNumber: string,
  parentTokenId: bigint | number,
  signerOrPrivateKey?: ethers.Signer | string
): Promise<MintResult> {
  try {
    const contract = getWriteContract(signerOrPrivateKey);

    const normalizedRoot = merkleRoot.startsWith("0x") ? merkleRoot : `0x${merkleRoot}`;
    const normalizedOriginal = merkleRootOriginal.startsWith("0x") ? merkleRootOriginal : `0x${merkleRootOriginal || "0".repeat(64)}`;
    const parentTokenIdBig = typeof parentTokenId === "number" ? BigInt(parentTokenId) : parentTokenId;

    const tx: ContractTransactionResponse = await contract["mintProvenanceWithChain(bytes32,bytes32,string,string,string,string,uint256)"](
      normalizedRoot,
      normalizedOriginal,
      zkResKey,
      prompt,
      model,
      sequenceNumber,
      parentTokenIdBig
    );

    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();

    if (!receipt) {
      return {
        success: false,
        error: "Transaction receipt not obtained",
      };
    }

    let tokenId: bigint | undefined;

    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed && parsed.name === "ProvenanceMinted") {
          tokenId = parsed.args[0] as bigint;
          break;
        }
      } catch {
        // Ignorar
      }
    }

    return {
      success: true,
      tokenId,
      transactionHash: receipt.hash,
      merkleRoot: normalizedRoot,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Error minting NFT: ${error.message}`,
    };
  }
}

// ============================================
// Utils para Frontend
// ============================================

/**
 * Chequea si el contrato está configurado.
 */
export function isContractConfigured(): boolean {
  return !!CONTRACT_ADDRESS && CONTRACT_ADDRESS.length > 0;
}
