# Stack — ChainRight

## Decisions

- Language: TypeScript
- Framework: Next.js 15 (App Router) + React 19
- Smart Contracts: Solidity + Hardhat
- Styling: Tailwind CSS v4
- Storage: 0G Storage (@0glabs/0g-ts-sdk 0.3.3)
- Compute: 0G Compute Network (@0glabs/0g-serving-broker 0.6.6)
- Chain: 0G Chain (EVM-compatible, evmVersion: "cancun")
- Wallet: ethers v6.13.1 + MetaMask (RainbowKit para demo avanzada - DEMO: usar ethers directamente para simplicidad)
- Deploy: Vercel (frontend) + 0G Testnet (contracts)

## Blockchain

> Extensión de arz_plugin_blockchain.md

- Chain: 0G Chain
- Network (dev): 0G Galileo Testnet (Chain ID: 16602)
- Network (prod): 0G Aristotle Mainnet (Chain ID: 16661)
- Contract language: Solidity ^0.8.24
- Tooling: Hardhat
- Wallet integration: ethers v6 + MetaMask
- RPC provider: Public RPC de 0G (https://evmrpc-testnet.0g.ai)
- Block explorer: https://chainscan-galileo.0g.ai (testnet)
- Contract upgrade strategy: immutable (para hackathon, simplicidad)

## Deployed Contracts

| Contract | Network | Address | Verified |
|---|---|---|---|
| ChainRightERC721 | 0G Testnet | `TBD` | ⬜ |

## Agent Skills

| Skill | Reason | Usage |
|---|---|---|
| `nextjs-15` | Frontend con Next.js App Router | Pages, routing, Server Actions |
| `react-19` | Componentes React 19 | UI, state, efectos |
| `tailwind-4` | Estilos con Tailwind v4 | Diseño responsive, componentes |
| `typescript` | TypeScript estricto | Tipos, interfaces, seguridad |
| `solidity-security` | Seguridad en contratos Solidity | Antes de deployar, revisar patrones |
| `storage/upload-file` | 0G Storage | Subir imágenes y metadata |
| `storage/download-file` | 0G Storage | Descargar para verificación |
| `storage/merkle-verification` | 0G Storage | Verificar integridad de datos |
| `compute/text-to-image` | 0G Compute | Generar imágenes con Flux Turbo |
| `compute/provider-discovery` | 0G Compute | Encontrar providers disponibles |
| `compute/account-management` | 0G Compute | Depositar, transferir, verificar balance |
| `chain/deploy-contract` | 0G Chain | Deployar ChainRightERC721 |
| `chain/interact-contract` | 0G Chain | Mint, read, verify on-chain |
| `cross-layer/storage-plus-chain` | Cross-layer | Registrar Merkle root on-chain |
| `cross-layer/compute-plus-storage` | Cross-layer | Generar imagen + almacenar |

## Active MCPs

Este proyecto no usa MCPs externos más allá de los provistos por el sistema. Todo se hace via 0G SDKs.

## Folder Structure

```
chainright/
├── app/                    # Next.js App Router
│   ├── create/            # Generar + mintear
│   ├── verify/            # Verificar autenticidad
│   └── page.tsx           # Home
├── components/            # React components
│   ├── ImageGenerator/   # Generador de imágenes
│   ├── NFTMinter/        # Mint de NFT
│   └── Verifier/         # Verificador
├── contracts/             # Solidity contracts
│   └── ChainRightERC721.sol
├── lib/                   # Utilidades y SDK wrappers
│   ├── storage.ts        # 0G Storage wrapper
│   ├── compute.ts        # 0G Compute wrapper
│   └── contract.ts       # ethers v6 wrapper
├── types/                 # TypeScript interfaces
├── scripts/               # Hardhat deploy scripts
├── hardhat.config.ts      # Hardhat config (evmVersion: cancun)
├── .env.example           # Variables de entorno
├── product.md             # ARZ Lite - producto
├── stack.md               # ARZ Lite - stack
├── userflow_*.md          # ARZ Lite - userflows
└── AGENTS.md              # Orquestación del proyecto
```

## Environment Variables

| Variable | Value for demo |
|---|---|
| `PRIVATE_KEY` | Wallet privada para deploy y tests (nunca commitear) |
| `NEXT_PUBLIC_RPC_URL` | `https://evmrpc-testnet.0g.ai` |
| `NEXT_PUBLIC_CHAIN_ID` | `16602` |
| `NEXT_PUBLIC_STORAGE_INDEXER` | `https://indexer-storage-testnet-turbo.0g.ai` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `TBD` - despues de deploy |
| `PROVIDER_ADDRESS` | `TBD` - provider de text-to-image (se descubre via provider-discovery) |

## Commands

- Dev frontend: `npm run dev`
- Dev chain (Hardhat Network): `npx hardhat node`
- Compilar contratos: `npm run compile`
- Deployar a testnet: `npx hardhat run scripts/deploy.ts --network 0g-testnet`
- Build: `npm run build`

## 0G Network Config

### Testnet (Galileo)
| Parámetro | Valor |
|---|---|
| RPC | `https://evmrpc-testnet.0g.ai` |
| Chain ID | `16602` |
| Currency | 0G |
| Explorer | `https://chainscan-galileo.0g.ai` |
| Storage RPC | `https://storagerpc-testnet.0g.ai` |
| Storage Indexer | `https://indexer-storage-testnet-turbo.0g.ai` |
| Faucet | `https://faucet.0g.ai` |

### Mainnet (Aristotle)
| Parámetro | Valor |
|---|---|
| RPC | `https://evmrpc.0g.ai` |
| Chain ID | `16661` |
| Explorer | `https://chainscan.0g.ai` |

## Critical Rules (de 0G AGENTS.md)

### SIEMPRE:
- Llamar `processResponse()` DESPUÉS de CADA inferencia
- Orden correcto de parámetros: `processResponse(providerAddress, chatID, usageData)`
- Extraer ChatID del header `ZG-Res-Key` PRIMERO
- Usar `evmVersion: "cancun"` para TODOS los contratos
- Usar ethers **v6** (nunca v5): `ethers.JsonRpcProvider`, `ethers.parseEther`
- Cerrar `ZgFile` con `file.close()` en bloque `finally`
- Claves privadas SOLO desde `.env`

### NUNCA:
- Saltearte `processResponse()` (bloquea fondos)
- Invertir orden de parámetros de `processResponse()`
- Hardcodear private keys
- Perder el Merkle Root (sin él no recuperás el archivo)
- Usar evmVersion que no sea "cancun"

## What we are NOT Building

> Corte explícito para evitar scope creep a las 3am.

- No galería personal de NFTs — solo crear y verificar
- No transferencias entre usuarios — el NFT queda en la wallet que lo minteó
- No royalties ni secondary sales — para demo no importa
- No autenticación de usuario más allá de MetaMask
- No historial completo — solo lo que está on-chain
- No edición de metadata — una vez minteado, es inmutable (esa es la gracia)
