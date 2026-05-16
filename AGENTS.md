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
6. **Agente de Telegram**: Usuario envía imagen al bot → el agente autónomamente verifica con DeepSeek + 0G Chain
7. Conclusión: ChainRight le da procedencia irrefutable a obras de IA + agente autónomo con memoria persistente

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 (Black & Amber design)
- **Blockchain**: 0G Chain (EVM-compatible, evmVersion: "cancun")
- **Storage**: 0G Storage (@0gfoundation/0g-ts-sdk 1.2.8) — KV/Log for agent persistent memory
- **Compute**: 0G Compute Network (@0glabs/0g-serving-broker 0.6.6)
- **Fallback Compute**: OpenAI Images API (solo tras consentimiento explícito)
- **Wallet UX**: RainbowKit + Wagmi + Viem (wallet gate obligatorio)
- **Contracts**: Solidity ^0.8.24 + Hardhat
- **Wallet**: ethers v6.13.1 + MetaMask
- **Deploy**: Vercel (frontend) + 0G Testnet (contracts)
- **Agent**: grammY + DeepSeek Function Calling + tsx

## 0G Network for Demo

- **Network**: 0G Galileo Testnet
- **Chain ID**: 16602
- **RPC**: `https://evmrpc-testnet.0g.ai`
- **Explorer**: `https://chainscan-galileo.0g.ai`
- **Storage Indexer**: `https://indexer-storage-testnet-turbo.0g.ai`
- **Faucet**: `https://faucet.0g.ai`

## Current Focus

1. **Web App**: Generate → Store → Mint → Verify con Wow Moment
2. **Design System**: Black & Amber Edition (extraído de Stitch)
3. **Autonomous Agent**: Telegram bot con DeepSeek Function Calling
4. **Agent Memory**: 0G Storage KV/Log para persistencia descentralizada

## MVP Persistence

- Persistencia local demo con `db.json` (users + works) para la web.
- Agente: `agent-state.json` y `agent-log.json` con sync periódico a 0G Storage.
- Merkle Roots persistidos en `.0g-kv-root` para recuperación cross-restart.
- No es producción. Es válido para hackathon MVP.

## Agent Architecture

### Tool Definitions (Function Calling)

| Tool | Trigger | Action |
|---|---|---|
| `verify_image` | User sends image + "verify", "check", "authenticate" | Computes Merkle Root, queries 0G Chain, returns provenance + PDF |
| `show_help` | User asks "what can you do", "help" | Returns help message |
| `show_stats` | User asks "stats", "history" | Returns verification statistics |
| `chat_reply` | Small talk, greetings | Conversational response |

### Agent Memory (0G Storage KV/Log)

```
agent-state.json → uploadBuffer() → 0G Storage (Merkle Root stored in .0g-kv-root)
agent-log.json   → uploadBuffer() → 0G Storage

On restart: downloadFile(merkleRoot) → restore state
On shutdown (SIGINT): final syncTo0G()
```

### Agent Flow

```
User message + image → agentThink() [DeepSeek] → tool_calls
→ executeTool() → verifyImageData() → Merkle + Chain
→ agentRespond() [DeepSeek] → natural language response + PDF
→ maybeSyncTo0G() [every 5 verifications]
```

## P2 Backlog

- Mejorar “wow moment” inicial con experiencia guiada y visual para video.

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
| `agent/verify` | Agent | Image verification via Merkle + Chain |
| `agent/nlp` | Agent | DeepSeek Function Calling |
| `agent/memory/kv` | Agent | Persistent state |
| `agent/memory/0g-kv` | Agent | 0G Storage KV/Log sync |

## Agent Skills

| Skill | Description |
|---|---|
| `agent/bot.ts` | Entrypoint — Function Calling loop |
| `agent/handlers/verify.ts` | Image verification (Merkle + Chain + PDF) |
| `agent/utils/nlp.ts` | DeepSeek Function Calling integration |
| `agent/utils/pdf.ts` | Certificate PDF generation in Node.js |
| `agent/utils/tools.ts` | Agent tool definitions (verify_image, show_help, show_stats, chat_reply) |
| `agent/memory/0g-kv.ts` | 0G Storage KV/Log wrapper (uploadBuffer/downloadFile) |
| `agent/memory/kv.ts` | Local KV state (JSON file) |
| `agent/memory/log.ts` | Local log history (JSON file) |

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
| ChainRightERC721 v3 | 0G Testnet | `0xfca49910C81355eE3787e4E87F16a18E593bedB0` | ⬜ |
| ChainRightERC721 v2 | 0G Testnet | `0xE76B9fcbf59B4eBE7CE6c41939BA68D65c65Bb44` | ⬜ |
| ChainRightERC721 v1 | 0G Testnet | `0x4424d49ED6d3748980FFfB0ba0b2a4e92db4Ed05` | ⬜ |

> v3 agrega `merkleRootOriginal`, `parentTokenId` al struct + `mintProvenanceWithChain()` para el flujo completo de edición IA. Compatible hacia atrás con v2.

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
