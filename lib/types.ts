/**
 * Interfaces TypeScript para ChainRight.
 */

// ============================================
// Procedencia de una obra
// ============================================
export interface Provenance {
  merkleRoot: string;           // bytes32 como string hex
  zkResKey: string;             // ZG-Res-Key de la inferencia
  prompt: string;               // Prompt exacto usado
  model: string;                // Modelo de IA usado
  timestamp: bigint;            // Timestamp del bloque
  creator: string;              // Address del creador
  exists: boolean;              // Si el registro existe
}

// ============================================
// Resultado de generar una imagen
// ============================================
export interface ImageGenerationResult {
  success: boolean;
  fallbackRequired?: boolean;   // true cuando no hay providers 0G y se requiere consentimiento
  fallbackReason?: string;      // motivo de fallback
  source?: "0g-compute" | "openai-fallback";
  imageUrl?: string;            // URL de la imagen (o base64)
  imageData?: Uint8Array;       // Datos binarios de la imagen
  zkResKey: string;             // ZG-Res-Key del header
  providerAddress: string;      // Provider que ejecutó la inferencia
  model: string;                // Modelo usado
  prompt: string;               // Prompt usado
  error?: string;               // Error si falló
}

// ============================================
// Resultado de subir a Storage
// ============================================
export interface StorageUploadResult {
  success: boolean;
  merkleRoot?: string;          // Merkle Root (hash único)
  transactionHash?: string;     // Hash de la transacción
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
  message: string;               // Mensaje para el usuario
}

// ============================================
// Provider de Compute
// ============================================
export interface ComputeProvider {
  address: string;               // Address del provider
  serviceType: string;           // 'chatbot', 'text-to-image', 'speech-to-text'
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
