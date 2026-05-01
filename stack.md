# Stack — ChainRight

## Decisions

- Language: TypeScript
- Framework: Next.js 15 (App Router) + React 19
- Smart Contracts: Solidity + Hardhat
- Styling: Tailwind CSS v4
- Storage: 0G Storage (@0gfoundation/0g-ts-sdk 1.2.8)
- Compute: 0G Compute Network (@0glabs/0g-serving-broker 0.6.6)
- Fallback Image Generation: OpenAI Images API (`openai`)
  - Demo profile: `gpt-image-1-mini`, `size: auto` (válido), `quality: low`, `jpeg` + compression
- Wallet Auth/UI Gate: RainbowKit + Wagmi + Viem
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
| ChainRightERC721 | 0G Testnet | `0x4424d49ED6d3748980FFfB0ba0b2a4e92db4Ed05` | ⬜ |

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
| `RPC_URL` | `https://evmrpc-testnet.0g.ai` (server-side actions) |
| `STORAGE_INDEXER` | `https://indexer-storage-testnet-turbo.0g.ai` (server-side actions) |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x4424d49ED6d3748980FFfB0ba0b2a4e92db4Ed05` |
| `PROVIDER_ADDRESS` | `TBD` - provider de text-to-image (se descubre via provider-discovery) |
| `OPENAI_API_KEY` | API key para fallback de imagen cuando no hay providers en 0G |

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

## Contract ABI Compatibility Note

- `mintWithProvenance` en el despliegue actual usa firma de 4 args:
  `mintWithProvenance(bytes32 merkleRoot, string zkResKey, string prompt, string model)`
- El wrapper `lib/contract.ts` tiene fallback compatible para 4/5 args.

## Storage Upload Troubleshooting

- Si aparece `execution reverted` en upload:
  1. Confirmar que `PRIVATE_KEY` sea la wallet fondeada en testnet.
  2. Confirmar coherencia de entorno server-side: `RPC_URL` + `STORAGE_INDEXER`.
  3. Verificar payload no vacío y tamaño razonable.

## Fallback Strategy (text-to-image)

- Intentar SIEMPRE primero `0G Compute`.
- Si no hay providers disponibles:
  - La app muestra un modal de consentimiento.
  - Solo si el usuario acepta, se ejecuta fallback con OpenAI.
  - El fallback usa perfil económico para demo (bajo costo).
- El flujo posterior se mantiene en testnet:
  - Upload a 0G Storage
  - Mint en 0G Chain
  - Verify on-chain

## Storage Upload Transport

- El guardado a 0G Storage se hace vía `POST /api/storage/upload` (multipart/form-data).
- Motivo: mayor estabilidad que enviar base64 pesado por Server Actions en este flujo.

## Next.js Server Actions Limits

- Se configuró `serverActions.bodySizeLimit = "8mb"` en `next.config.ts` para permitir envío de imagen base64 al guardar en 0G Storage.

## MVP UX Persistence

- Se usa `db.json` como almacenamiento local MVP para `users` y `works`.
- Endpoints:
  - `POST /api/users/login`
  - `GET /api/works?wallet=0x...`
  - `POST /api/works`

## P2 Backlog

- Reintroducir y mejorar el “Wow Feature” (modificación de 1 píxel y contraste visual de hashes) con UX guiada para video.

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
