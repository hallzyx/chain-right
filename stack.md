# Stack — ChainRight

## Decisions

- Language: TypeScript
- Framework: Next.js 15 (App Router) + React 19
- Smart Contracts: Solidity + Hardhat
- Styling: Tailwind CSS v4 (Black & Amber design system from Stitch)
- Storage: 0G Storage (@0gfoundation/0g-ts-sdk 1.2.8) — upload, download, Merkle tree, Indexer, KV/Log
- Compute: 0G Compute Network (@0glabs/0g-serving-broker 0.6.6)
- Fallback Image Generation: OpenAI Images API (`openai`)
  - Demo profile: `gpt-image-1-mini`, `size: auto` (valid), `quality: low`, `jpeg` + compression
- Wallet Auth/UI Gate: RainbowKit + Wagmi + Viem
- Chain: 0G Chain (EVM-compatible, evmVersion: "cancun")
- Wallet: ethers v6.13.1 + MetaMask (RainbowKit for advanced demo — DEMO: use ethers directly for simplicity)
- PDF Generation: `jspdf` (certificate export for verified works)
- Deploy: Vercel (frontend) + 0G Testnet (contracts)
- **Agent NLP**: DeepSeek chat API (Function Calling for autonomous tool selection)
- **Agent Framework**: grammY (Telegram Bot framework for Node.js)
- **Agent Runtime**: tsx (TypeScript execution without build step)

## Blockchain

> Extension of arz_plugin_blockchain.md

- Chain: 0G Chain
- Network (dev): 0G Galileo Testnet (Chain ID: 16602)
- Network (prod): 0G Aristotle Mainnet (Chain ID: 16661)
- Contract language: Solidity ^0.8.24
- Tooling: Hardhat
- Wallet integration: ethers v6 + MetaMask
- RPC provider: Public 0G RPC (https://evmrpc-testnet.0g.ai)
- Block explorer: https://chainscan-galileo.0g.ai (testnet)
- Contract upgrade strategy: immutable (for hackathon, simplicity)

## Deployed Contracts

| Contract | Network | Address | Verified |
|---|---|---|---|
| ChainRightERC721 v1 | 0G Testnet | `0x4424d49ED6d3748980FFfB0ba0b2a4e92db4Ed05` | ⬜ |
| ChainRightERC721 v1 | 0G Testnet | `0xF11baF976030502598569ECf65A9F8dbFA3C8434` | ⬜ |
| ChainRightERC721 v2 | 0G Testnet | `0xE76B9fcbf59B4eBE7CE6c41939BA68D65c65Bb44` | ⬜ |

> v2 adds `sequenceNumber` (txSeq) to the struct + `mintWithProvenance` now accepts 5 params + `tokenURI` on-chain.

## Agent Skills

| Skill | Reason | Usage |
|---|---|---|
| `nextjs-15` | Frontend with Next.js App Router | Pages, routing, Server Actions |
| `react-19` | React 19 components | UI, state, effects |
| `tailwind-4` | Tailwind v4 styles | Responsive design, components |
| `typescript` | Strict TypeScript | Types, interfaces, safety |
| `solidity-security` | Contract security | Before deploy, review patterns |
| `storage/upload-file` | 0G Storage | Upload images and metadata |
| `storage/download-file` | 0G Storage | Download for verification |
| `storage/merkle-verification` | 0G Storage | Verify data integrity |
| `compute/text-to-image` | 0G Compute | Generate images with Flux Turbo |
| `compute/provider-discovery` | 0G Compute | Find available providers |
| `compute/account-management` | 0G Compute | Deposit, transfer, check balance |
| `chain/deploy-contract` | 0G Chain | Deploy ChainRightERC721 |
| `chain/interact-contract` | 0G Chain | Mint, read, verify on-chain |
| `cross-layer/storage-plus-chain` | Cross-layer | Register Merkle root on-chain |
| `cross-layer/compute-plus-storage` | Cross-layer | Generate image + store |

## Active MCPs

This project does not use external MCPs beyond those provided by the system. Everything is done via 0G SDKs.

## Folder Structure

```
chainright/
├── app/                    # Next.js App Router
│   ├── create/            # Generate + mint
│   ├── verify/            # Verify authenticity (includes manual Merkle root accordion)
│   ├── my-works/          # User's minted works gallery
│   └── page.tsx           # Home
├── components/            # React components
│   ├── app-shell.tsx      # App layout shell
│   ├── providers.tsx      # RainbowKit + Wagmi providers
│   ├── client-root.tsx    # Client-side root wrapper
│   ├── wallet-gate.tsx    # Wallet connection gate
│   ├── session-sync.tsx   # Session sync with db.json
│   ├── certificate-card.tsx  # Certificate display card
│   ├── my-works.tsx       # My Works gallery
│   └── wow-moment.tsx     # Pixel-tampering verification demo
├── agent/                  # Autonomous Telegram Agent
│   ├── bot.ts             # Entrypoint — Function Calling loop
│   ├── context.ts         # Bot context type
│   ├── handlers/
│   │   ├── verify.ts      # Image verification (Merkle + Chain)
│   │   ├── start.ts       # /start command
│   │   ├── help.ts        # /help command
│   │   └── stats.ts       # /stats command
│   ├── memory/
│   │   ├── kv.ts          # Local KV state (JSON)
│   │   ├── log.ts         # Local log history (JSON)
│   │   └── 0g-kv.ts       # 0G Storage KV/Log sync wrapper
│   └── utils/
│       ├── nlp.ts         # DeepSeek Function Calling integration
│       ├── telegram.ts    # Telegram image download
│       ├── format.ts      # Message formatting
│       ├── pdf.ts         # Certificate PDF generation
│       └── tools.ts       # Agent tool definitions
├── contracts/             # Solidity contracts
│   └── ChainRightERC721.sol
├── lib/                   # Utilities and SDK wrappers
│   ├── storage.ts        # 0G Storage wrapper
│   ├── compute.ts        # 0G Compute wrapper
│   ├── contract.ts       # ethers v6 wrapper
│   ├── certificate-pdf.ts # jspdf certificate PDF generation
│   ├── openai.ts         # OpenAI fallback
│   ├── db.ts             # db.json persistence
│   ├── utils.ts          # Shared utilities
│   ├── wallet-config.ts  # RainbowKit + Wagmi config
│   ├── types.ts          # TypeScript interfaces
│   └── abi/              # Contract ABIs
│       └── ChainRightERC721.abi.ts
├── scripts/               # Hardhat deploy scripts
├── hardhat.config.ts      # Hardhat config (evmVersion: cancun)
├── .env.example           # Environment variables
├── product.md             # ARZ Lite — product
├── stack.md               # ARZ Lite — stack
├── userflow_*.md          # ARZ Lite — userflows
└── AGENTS.md              # Project orchestration
```

## Environment Variables

| Variable | Value for demo |
|---|---|
| `PRIVATE_KEY` | Private wallet for deploy and tests (never commit) |
| `NEXT_PUBLIC_RPC_URL` | `https://evmrpc-testnet.0g.ai` |
| `NEXT_PUBLIC_CHAIN_ID` | `16602` |
| `NEXT_PUBLIC_STORAGE_INDEXER` | `https://indexer-storage-testnet-turbo.0g.ai` |
| `RPC_URL` | `https://evmrpc-testnet.0g.ai` (server-side actions) |
| `STORAGE_INDEXER` | `https://indexer-storage-testnet-turbo.0g.ai` (server-side actions) |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0xE76B9fcbf59B4eBE7CE6c41939BA68D65c65Bb44` |
| `PROVIDER_ADDRESS` | `TBD` — text-to-image provider (discovered via provider-discovery) |
| `OPENAI_API_KEY` | API key for image fallback when no 0G providers available |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather (for agent) |
| `DEEPSEEK_API_KEY` | DeepSeek API key for agent NLP / Function Calling |

## Commands

- Dev frontend: `npm run dev`
- Run agent: `npm run agent`
- Dev chain (Hardhat Network): `npx hardhat node`
- Compile contracts: `npm run compile`
- Deploy to testnet: `npx hardhat run scripts/deploy.ts --network 0g-testnet`
- Build: `npm run build`

## 0G Network Config

### Testnet (Galileo)
| Parameter | Value |
|---|---|
| RPC | `https://evmrpc-testnet.0g.ai` |
| Chain ID | `16602` |
| Currency | 0G |
| Explorer | `https://chainscan-galileo.0g.ai` |
| Storage RPC | `https://storagerpc-testnet.0g.ai` |
| Storage Indexer | `https://indexer-storage-testnet-turbo.0g.ai` |
| StorageScan | `https://storagescan-galileo.0g.ai` |
| Faucet | `https://faucet.0g.ai` |

### Mainnet (Aristotle)
| Parameter | Value |
|---|---|
| RPC | `https://evmrpc.0g.ai` |
| Chain ID | `16661` |
| Explorer | `https://chainscan.0g.ai` |

## Critical Rules (from 0G AGENTS.md)

### ALWAYS:
- Call `processResponse()` AFTER EVERY inference
- Correct parameter order: `processResponse(providerAddress, chatID, usageData)`
- Extract ChatID from `ZG-Res-Key` header FIRST
- Use `evmVersion: "cancun"` for ALL contracts
- Use ethers **v6** (never v5): `ethers.JsonRpcProvider`, `ethers.parseEther`
- Close `ZgFile` with `file.close()` in `finally` block
- Private keys ONLY from `.env`

### NEVER:
- Skip `processResponse()` (locks funds)
- Invert `processResponse()` parameter order
- Hardcode private keys
- Lose the Merkle Root (without it you can't retrieve the file)
- Use evmVersion other than "cancun"

## Contract ABI Compatibility Note

- `mintWithProvenance` v1 uses 4-arg signature:
  `mintWithProvenance(bytes32 merkleRoot, string zkResKey, string prompt, string model)`
- `mintWithProvenance` v2 uses 5-arg signature:
  `mintWithProvenance(bytes32 merkleRoot, string zkResKey, string prompt, string model, string sequenceNumber)`
- The wrapper `lib/contract.ts` has backward-compatible fallback for 4/5 args.

## Storage Upload Troubleshooting

- If `execution reverted` appears on upload:
  1. Confirm `PRIVATE_KEY` is the wallet funded on testnet.
  2. Confirm server-side env coherence: `RPC_URL` + `STORAGE_INDEXER`.
  3. Verify payload is not empty and size is reasonable.

## Fallback Strategy (text-to-image)

- ALWAYS try `0G Compute` first.
- If no providers are available:
  - The app shows a consent modal.
  - Only if the user accepts, fallback to OpenAI is executed.
  - Fallback uses budget profile for demo (low cost).
- Post-generation flow stays on testnet:
  - Upload to 0G Storage
  - Mint on 0G Chain
  - Verify on-chain

## Storage Upload Transport

- Saving to 0G Storage is done via `POST /api/storage/upload` (multipart/form-data).
- Reason: more stable than sending heavy base64 via Server Actions in this flow.

## Next.js Server Actions Limits

- Configured `serverActions.bodySizeLimit = "8mb"` in `next.config.ts` to allow base64 image submission when saving to 0G Storage.

## MVP UX Persistence

- Uses `db.json` as local MVP storage for `users` and `works`.
- Endpoints:
  - `POST /api/users/login`
  - `GET /api/works?wallet=0x...`
  - `POST /api/works`

## Verify Page — Manual Merkle Root Verification

The Verify page (`app/verify/page.tsx`) includes an accordion section for manual Merkle root verification:
- Users can paste a Merkle root hash and check it against on-chain records.
- Bypasses the full upload + comparison flow for quick lookups.
- Returns the stored provenance metadata if found.

## StorageScan URL Format

- StorageScan submission URLs follow the format:
  `https://storagescan-galileo.0g.ai/submission/{txSeq}`
- Where `{txSeq}` is the `sequenceNumber` stored in the v2 contract struct.
- Used to link users to their on-chain storage proof via the StorageScan explorer.

## What we are NOT Building

> Explicit cutoff to avoid scope creep at 3am.

- No personal NFT gallery — only create and verify
- No transfers between users — the NFT stays in the wallet that minted it
- No royalties or secondary sales — irrelevant for demo
- No user authentication beyond MetaMask
- No full history — only what's on-chain
- No metadata editing — once minted, it's immutable (that's the point)
