# AGENTS.md — ChainRight
> Project orchestration for ARZ Lite + 0G AI Stack + Blockchain Plugin.
> Always read this first.

## Active Plugins

- `arz_lite.md` — Hackathon mode (24-72h, speed over completeness)
- `arz_plugin_blockchain.md` — 0G Chain / NFT with provenance

## Documentation Map

| File | Status |
|---|---|
| `product.md` | ✅ complete |
| `stack.md` | ✅ complete |
| `userflow_generar_mintear.md` | ✅ complete |
| `userflow_verificar.md` | ✅ complete |

## Loading Rules

- Before any task → read this AGENTS.md first
- Before implementing a feature → read `userflow_<feature>.md`
- Before any technical decision → read `stack.md`
- Before understanding the product → read `product.md`
- Before ANY 0G operation → read `.0g-skills/AGENTS.md` for critical rules

## Demo Flow Summary

El jurado verá:
1. Usuario ingresa un prompt y genera una imagen via 0G Compute (Flux Turbo)
2. Sistema muestra ZG-Res-Key + metadata de la inferencia
3. Usuario guarda la imagen en 0G Storage → obtiene Merkle Root
4. Usuario conecta MetaMask y mintea un NFT en 0G Chain
5. Wow moment: Usuario modifica UN PÍXEL, intenta verificar → falla
6. Conclusión: ChainRight le da procedencia irrefutable a obras de IA

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS v4
- **Blockchain**: 0G Chain (EVM-compatible, evmVersion: "cancun")
- **Storage**: 0G Storage (@0gfoundation/0g-ts-sdk 1.2.8)
- **Compute**: 0G Compute Network (@0glabs/0g-serving-broker 0.6.6)
- **Fallback Compute**: OpenAI Images API (solo tras consentimiento explícito)
- **Contracts**: Solidity ^0.8.24 + Hardhat
- **Wallet**: ethers v6.13.1 + MetaMask
- **Deploy**: Vercel (frontend) + 0G Testnet (contracts)

## 0G Network for Demo

- **Network**: 0G Galileo Testnet
- **Chain ID**: 16602
- **RPC**: `https://evmrpc-testnet.0g.ai`
- **Explorer**: `https://chainscan-galileo.0g.ai`
- **Storage Indexer**: `https://indexer-storage-testnet-turbo.0g.ai`
- **Faucet**: `https://faucet.0g.ai`

## Current Focus

1. **Scaffoldear el proyecto**: Next.js + 0G SDKs + estructura
2. **Escribir y deployar el contrato**: ChainRightERC721
3. **Implementar flujo 1**: Generar + mintear
4. **Implementar flujo 2**: Verificar autenticidad
5. **Polish demo**: wow moment del píxel modificado

## Active Skills

| Skill | Reason | Usage |
|---|---|---|
| `nextjs-15` | Next.js 15 App Router | Pages, routing, Server Actions |
| `react-19` | React 19 + Compiler | Components, state |
| `tailwind-4` | Tailwind v4 | Styling, responsive design |
| `typescript` | TypeScript strict | Types, interfaces |
| `solidity-security` | Contract security | Before deployment review |
| `storage/upload-file` | 0G Storage | Upload images + metadata |
| `storage/download-file` | 0G Storage | Download for verification |
| `storage/merkle-verification` | 0G Storage | Verify file integrity |
| `compute/text-to-image` | 0G Compute | Flux Turbo image generation |
| `compute/provider-discovery` | 0G Compute | Find available providers |
| `compute/account-management` | 0G Compute | Deposit, transfer, check balance |
| `chain/deploy-contract` | 0G Chain | Deploy ChainRightERC721 |
| `chain/interact-contract` | 0G Chain | Mint, read, verify on-chain |
| `cross-layer/storage-plus-chain` | Cross-layer | Register merkle root on-chain |
| `cross-layer/compute-plus-storage` | Cross-layer | Generate + store pipeline |

## CRITICAL 0G RULES — THESE BREAK THINGS IF IGNORED

## Fallback Rule (No Providers)

- Si no hay providers de `text-to-image` en 0G:
  1. Mostrar modal al usuario explicando el fallback.
  2. Ejecutar OpenAI fallback SOLO si el usuario acepta.
  3. Nunca ejecutar fallback automáticamente sin consentimiento.
  4. Usar perfil económico para demo (`gpt-image-1-mini`, `size: auto`, calidad baja, jpeg comprimido).

### Compute Rules (processResponse)

> **ALWAYS** call `processResponse()` after EVERY inference. This is NOT optional.
> **ALWAYS** use this parameter order:
> ```typescript
> await broker.inference.processResponse(
>   providerAddress,  // 1st: ALWAYS FIRST
>   chatID,           // 2nd
>   usageData         // 3rd (optional for images)
> );
> ```
> **WRONG ORDER = SILENT FEE BUG = FUNDS LOCKED**

> **ALWAYS** extract ChatID from header FIRST:
> ```typescript
> let chatID = response.headers.get('ZG-Res-Key') || response.headers.get('zg-res-key');
> ```
> Only use `data.id` as fallback for chatbot (NOT for images).

> **ALWAYS** acknowledge provider before first use:
> ```typescript
> await broker.inference.acknowledgeProviderSigner(providerAddress);
> ```

### Storage Rules (Merkle + File Handles)

> **ALWAYS** generate Merkle tree BEFORE uploading:
> ```typescript
> const [tree, err] = await file.merkleTree();
> ```

> **ALWAYS** close ZgFile in a `finally` block:
> ```typescript
> const file = await ZgFile.fromFilePath(path);
> try {
>   // ... operations ...
> } finally {
>   await file.close();  // NEVER FORGET THIS
> }
> ```
> Unclosed handles = memory leaks.

> **ALWAYS** store the root hash. It's the ONLY way to retrieve the file.
> **NEVER** lose the root hash = data becomes IRRETRIEVABLE.

### Chain Rules (EVM Version + ethers)

> **ALWAYS** use `evmVersion: "cancun"` for ALL 0G Chain contracts:
> ```typescript
> solidity: {
>   version: "0.8.24",
>   settings: { evmVersion: "cancun" }  // REQUIRED
> }
> ```
> Wrong evmVersion = `invalid opcode` error on deployment.

> **ALWAYS** use ethers **v6**, NEVER v5:
> | v5 (WRONG) | v6 (CORRECT) |
> |---|---|
> | `ethers.providers.JsonRpcProvider` | `ethers.JsonRpcProvider` |
> | `ethers.utils.parseEther` | `ethers.parseEther` |
> | `ethers.utils.formatEther` | `ethers.formatEther` |
> | `contract.deployed()` | `contract.waitForDeployment()` |
> | `contract.address` | `await contract.getAddress()` |
> | `BigNumber.from()` | Native `bigint` |

### Security Rules

> **ALWAYS** load private keys from `.env`:
> ```typescript
> const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
> ```

> **NEVER** hardcode private keys. **NEVER** commit `.env`.

> **ALWAYS** add `.env` to `.gitignore`.

## Workflow Auto-Activations

From `.0g-skills/AGENTS.md`:

| When you say... | What auto-activates |
|---|---|
| "generate an image" | provider-discovery → account-management → text-to-image |
| "upload a file" | upload-file → merkle-verification |
| "deploy the contract" | deploy-contract |
| "mint an NFT" | interact-contract + storage-plus-chain |
| "verify this image" | merkle-verification → interact-contract |

## Deployed Contracts Tracking

| Contract | Network | Address | Verified |
|---|---|---|---|
| ChainRightERC721 | 0G Testnet | `0x4424d49ED6d3748980FFfB0ba0b2a4e92db4Ed05` | ⬜ |

> Update this table after every deploy.

## ARZ Lite Hackathon Rules (Speed > Perfection)

- **Happy path only**: Implement the demo flow first. Edge cases later (maybe never).
- **No tests**: Unless explicitly required.
- **No refactors**: If it works, move on.
- **Hardcode when needed**: Mock data, fixed IDs, static responses — all valid for demo. Mark with `// DEMO`.
- **One component = one file**: No premature abstraction.
- **Cut decision rule**: Is this in the demo flow in product.md? Yes → build it. No → cut it.

## Functions Need Doc Comments (But Keep Them Short)

```typescript
/** Mints NFT with provenance data. */
async function mintWithProvenance(...) { ... }
```

No need for @param/@returns unless genuinely complex.

## Next Recommended Action

1. **Scaffoldear el proyecto Next.js con la estructura definida en stack.md**
2. **Escribir el contrato ChainRightERC721.sol**
3. **Configurar Hardhat con evmVersion: "cancun"**
