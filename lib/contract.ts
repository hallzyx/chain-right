import { ethers, Contract, InterfaceAbi, ContractTransactionResponse } from "ethers";
import "dotenv/config";

import type { Provenance, MintResult, VerificationResult } from "./types";

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

// ABI mínimo de ChainRightERC721 (solo las funciones que necesitamos)
const CHAINRIGHT_ABI = [
  // Read
  "function records(bytes32) view returns (bytes32 merkleRoot, string zkResKey, string prompt, string model, uint256 timestamp, address creator, bool exists)",
  "function getProvenance(bytes32) view returns (bytes32, string, string, string, uint256, address, bool)",
  "function getProvenanceByToken(uint256) view returns (bytes32, string, string, string, uint256, address, bool)",
  "function tokenToRoot(uint256) view returns (bytes32)",
  "function creatorToRoots(address) view returns (bytes32[])",
  "function creatorWorksCount(address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  
  // Write
  // Compatibilidad: algunos despliegues usan 4 args, otros 5 args
  "function mintWithProvenance(bytes32, string, string, string)",
  "function mintWithProvenance(bytes32, string, string, string, string)",
  
  // Events
  "event ProvenanceMinted(uint256 indexed tokenId, bytes32 indexed merkleRoot, address indexed creator, string zkResKey, string prompt, string model)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
] as InterfaceAbi;

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
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS no configurado en .env. Primero deployá el contrato.");
  }
  const provider = getProvider();
  return new Contract(CONTRACT_ADDRESS, CHAINRIGHT_ABI, provider);
}

/**
 * Para operaciones de escritura (necesita wallet con gas).
 */
function getWriteContract(signerOrPrivateKey?: ethers.Signer | string): Contract {
  if (!CONTRACT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS no configurado");
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
      throw new Error("Necesitás un Signer o Private Key para operaciones de escritura");
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
 * Consulta el registro de procedencia por Merkle Root.
 * Función principal para verificar autenticidad.
 * 
 * @param merkleRoot bytes32 como string hex (debe empezar con 0x)
 */
export async function getProvenance(merkleRoot: string): Promise<Provenance | null> {
  try {
    const contract = getReadContract();

    // Normalizar: asegurarse que empiece con 0x
    const normalizedRoot = merkleRoot.startsWith("0x") ? merkleRoot : `0x${merkleRoot}`;

    const result = await contract.getProvenance(normalizedRoot);

    // result es una tupla: [merkleRoot, zkResKey, prompt, model, timestamp, creator, exists]
    const exists = result[6] as boolean;

    if (!exists) {
      return null;
    }

    return {
      merkleRoot: result[0] as string,
      zkResKey: result[1] as string,
      prompt: result[2] as string,
      model: result[3] as string,
      timestamp: result[4] as bigint,
      creator: result[5] as string,
      exists: true,
    };
  } catch (error: any) {
    console.error("Error consultando procedencia:", error.message);
    return null;
  }
}

/**
 * Consulta procedencia por Token ID.
 */
export async function getProvenanceByToken(tokenId: bigint | number): Promise<Provenance | null> {
  try {
    const contract = getReadContract();
    const tokenIdBigInt = typeof tokenId === "number" ? BigInt(tokenId) : tokenId;

    const result = await contract.getProvenanceByToken(tokenIdBigInt);
    const exists = result[6] as boolean;

    if (!exists) {
      return null;
    }

    return {
      merkleRoot: result[0] as string,
      zkResKey: result[1] as string,
      prompt: result[2] as string,
      model: result[3] as string,
      timestamp: result[4] as bigint,
      creator: result[5] as string,
      exists: true,
    };
  } catch (error: any) {
    console.error("Error consultando por token:", error.message);
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
      message: "✅ Autenticidad confirmada. Esta imagen está registrada en ChainRight.",
    };
  }

  return {
    verified: false,
    merkleRoot,
    message: "❌ Sin registro encontrado. Esta imagen no fue registrada en ChainRight.",
  };
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
 * Mintea un NFT con procedencia.
 * 
 * @param merkleRoot bytes32 del Merkle Root
 * @param zkResKey ZG-Res-Key de la inferencia
 * @param prompt Prompt exacto usado
 * @param model Modelo de IA usado
 * @param metadataUri URI de metadata (opcional)
 * @param signerOrPrivateKey Signer o private key para firmar
 */
export async function mintWithProvenance(
  merkleRoot: string,
  zkResKey: string,
  prompt: string,
  model: string,
  metadataUri: string,
  signerOrPrivateKey?: ethers.Signer | string
): Promise<MintResult> {
  try {
    const contract = getWriteContract(signerOrPrivateKey);

    // Normalizar merkleRoot
    const normalizedRoot = merkleRoot.startsWith("0x") ? merkleRoot : `0x${merkleRoot}`;

    // Llamar a mintWithProvenance (firma adaptable)
    // 1) Probar firma de 4 args
    // 2) Si no existe/revierte por selector, probar 5 args
    let tx: ContractTransactionResponse;

    try {
      tx = await contract["mintWithProvenance(bytes32,string,string,string)"](
        normalizedRoot,
        zkResKey,
        prompt,
        model
      );
    } catch (firstErr: any) {
      // Fallback a firma de 5 args para despliegues anteriores
      tx = await contract["mintWithProvenance(bytes32,string,string,string,string)"](
        normalizedRoot,
        zkResKey,
        prompt,
        model,
        metadataUri
      );
    }

    console.log("Transacción enviada:", tx.hash);
    console.log("Esperando confirmación...");

    // Esperar confirmación
    const receipt = await tx.wait();

    if (!receipt) {
      return {
        success: false,
        error: "No se obtuvo receipt de la transacción",
      };
    }

    // Extraer Token ID del evento ProvenanceMinted
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
        // Ignorar logs que no son de nuestro contrato
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
      error: `Error minteando NFT: ${error.message}`,
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
