/**
 * Interfaces TypeScript para ChainRight.
 */

// ============================================
// Procedencia de una obra
// ============================================
export interface Provenance {
  merkleRoot: string;              // bytes32 como string hex
  merkleRootOriginal: string;      // bytes32 de la obra original (0x0 si es original)
  zkResKey: string;                // ZG-Res-Key de la inferencia
  prompt: string;                  // Prompt de edición (vacío si es obra original)
  model: string;                   // "none" para original, "qwen-image-edit-2511" etc.
  sequenceNumber: string;          // txSeq de 0G Storage
  parentTokenId: bigint;           // 0 si es obra original
  timestamp: bigint;               // Timestamp del bloque
  creator: string;                 // Address del creador
  exists: boolean;                 // Si el registro existe
}

/** Modo de obra: original (sin IA) o asistida por IA. */
export type WorkMode = "original" | "ai-assist";

// ============================================
// Resultado de generar/editar una imagen
// ============================================
export interface ImageGenerationResult {
  success: boolean;
  fallbackRequired?: boolean;
  fallbackReason?: string;
  source?: "0g-compute" | "openai-fallback";
  imageUrl?: string;
  imageData?: Uint8Array;
  zkResKey: string;
  providerAddress: string;
  model: string;
  prompt: string;
  error?: string;
}

// ============================================
// Resultado de subir a Storage
// ============================================
export interface StorageUploadResult {
  success: boolean;
  merkleRoot?: string;          // Merkle Root (hash único)
  transactionHash?: string;     // Hash de la transacción
  sequenceNumber?: string;      // txSeq del SDK — número de submission para StorageScan
  submissionUrl?: string;       // URL: https://storagescan-galileo.0g.ai/submission/[txSeq]
  fileStorageUrl?: string;      // URL del archivo en Storage (fallback por merkle root)
  error?: string;
}

// ============================================
// Resultado de descargar de Storage
// ============================================
export interface StorageDownloadResult {
  success: boolean;
  data?: Uint8Array;
  verified?: boolean;           // Si pasó la verificación Merkle
  error?: string;
}

// ============================================
// Resultado de calcular Merkle Root
// ============================================
export interface MerkleResult {
  success: boolean;
  merkleRoot?: string;
  error?: string;
}

// ============================================
// Resultado de mintear NFT
// ============================================
export interface MintResult {
  success: boolean;
  tokenId?: bigint;
  transactionHash?: string;
  merkleRoot?: string;
  error?: string;
}

// ============================================
// Resultado de verificar autenticidad
// ============================================
export interface VerificationResult {
  verified: boolean;             // true si coincide con algún registro
  merkleRoot: string;            // Merkle Root calculado
  provenance?: Provenance;       // Datos de procedencia si existe
  parentProvenance?: Provenance; // NEW: obra original si tiene parentTokenId
  message: string;               // Mensaje para el usuario
}

// ============================================
// Provider de Compute
// ============================================
export interface ComputeProvider {
  address: string;               // Address del provider
  serviceType: string;           // 'chatbot', 'text-to-image', 'image-editing', 'speech-to-text'
  model: string;                 // Modelo ofrecido (ej: 'flux-turbo')
  teeVerified: boolean;          // Si corre en TEE (Trusted Execution Environment)
  url: string;                   // URL del endpoint
}

// ============================================
// Estado de cuenta en Compute
// ============================================
export interface ComputeAccount {
  totalBalance: bigint;
  availableBalance: bigint;
}

/** Estado completo del sistema 0G Compute para la UI. */
export interface ComputeStatus {
  accountExists: boolean;
  walletBalance: string;          // On-chain balance en 0G (string formateada)
  computeBalance: string;         // Compute ledger available en 0G
  computeTotalBalance: string;    // Compute ledger total en 0G
  providers: {
    textToImage: { available: boolean; model: string; address: string; teeVerified: boolean };
    imageEditing: { available: boolean; model: string; address: string; teeVerified: boolean };
    chatbot: { available: boolean; model: string; address: string; teeVerified: boolean };
  };
  providerBalances: Record<string, string>;  // Saldo por provider address
  costs: {
    accountMinDeposit: string;    // 0.1 0G
    providerTransfer: string;     // 0.01 0G
    estimatedPerInference: string; // ~0.002 0G
  };
}

// ============================================
// Configuración de la app
// ============================================
export interface AppConfig {
  rpcUrl: string;
  chainId: number;
  storageIndexer: string;
  contractAddress: string | null;
  providerAddress: string | null;
}

// ============================================
// Wallet State
// ============================================
export interface WalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  balance: bigint | null;
}
