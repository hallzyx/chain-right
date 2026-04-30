import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "dotenv/config";

/**
 * Configuración de Hardhat para 0G Chain.
 * 
 * REGLAS OBLIGATORIAS (de stack.md y AGENTS.md):
 * 1. evmVersion: "cancun" — SI O SI para 0G Chain.
 *    Cualquier otra versión da "invalid opcode" al deployar.
 * 2. ethers v6 — Hardhat Toolbox ya usa ethers v6 por defecto.
 * 3. Chain IDs:
 *    - Testnet (Galileo): 16602
 *    - Mainnet (Aristotle): 16661
 */

const PRIVATE_KEY = process.env.PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // ============================================
      // OBLIGATORIO PARA 0G CHAIN
      // ============================================
      evmVersion: "cancun",
      // ============================================
      // Si usas cualquier otra cosa (paris, shanghai, etc.)
      // vas a recibir "invalid opcode" al deployar.
      // ============================================
    },
  },
  networks: {
    // 0G Testnet — Galileo
    "0g-testnet": {
      url: "https://evmrpc-testnet.0g.ai",
      chainId: 16602,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    // 0G Mainnet — Aristotle
    "0g-mainnet": {
      url: "https://evmrpc.0g.ai",
      chainId: 16661,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    // Hardhat Network (para tests locales)
    hardhat: {
      chainId: 31337,
    },
  },
};

export default config;
