# Stack — ChainRight

## Decisions

- Language: TypeScript
- Framework: Next.js 15 (App Router) + React 19
- Smart Contracts: Solidity + Hardhat
- Styling: Tailwind CSS v4 (Black & Amber design system from Stitch)
- Storage: 0G Storage (@0gfoundation/0g-ts-sdk 1.2.8) — upload, download, Merkle tree, Indexer, KV/Log
- Compute: 0G Compute Network (@0glabs/0g-serving-broker 0.6.6)
  - Text-to-Image: `flux-turbo` (TEE-verified)
  - Image Editing: `qwen/qwen-image-edit-2511` (TEE-verified)
  - Chatbot (Agent NLP): `qwen/qwen-2.5-7b-instruct` (TEE-verified)
- Wallet Auth/UI Gate: RainbowKit + Wagmi + Viem
- Chain: 0G Chain (EVM-compatible, evmVersion: "cancun")
- Wallet: ethers v6.13.1 + MetaMask
- PDF Generation: `jspdf` (certificate export for verified works)
- Deploy: Vercel (frontend) + 0G Testnet (contracts)
- **Agent NLP**: 0G Compute (qwen/qwen-2.5-7b-instruct) with OpenAI-compatible tool calling
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
| ChainRightERC721 **v3** (active) | 0G Testnet | `0xfca49910C81355eE3787e4E87F16a18E593bedB0` | ⬜ |
| ChainRightERC721 v2 (legacy) | 0G Testnet | `0xE76B9fcbf59B4eBE7CE6c41939BA68D65c65Bb44` | ⬜ |
| ChainRightERC721 v1 (legacy) | 0G Testnet | `0x4424d49ED6d3748980FFfB0ba0b2a4e92db4Ed05` | ⬜ |

> v3 adds `merkleRootOriginal`, `parentTokenId` to the struct + `mintProvenanceWithChain()` for the AI edit parent-child flow. Backward compatible with v2.

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
| `compute/image-editing` | 0G Compute | AI edit with qwen-image-edit-2511 |
| `compute/chatbot` | 0G Compute | Agent NLP with qwen-2.5-7b-instruct |
| `compute/provider-discovery` | 0G Compute | Find available providers |
| `compute/account-management` | 0G Compute | Deposit, transfer, check balance |
| `chain/deploy-contract` | 0G Chain | Deploy ChainRightERC721 |
| `chain/interact-contract` | 0G Chain | Mint, read, verify on-chain |
| `cross-layer/storage-plus-chain` | Cross-layer | Register Merkle root on-chain |
| `cross-layer/compute-plus-storage` | Cross-layer | Generate + store pipeline |

## Active MCPs

This project does not use external MCPs beyond those provided by the system. Everything is done via 0G SDKs.

## Folder Structure

```
chainright/
├── app/                    # Next.js App Router
│   ├── create/            # Generate, Register Original, AI Edit
│   ├── verify/            # Verify authenticity (includes manual Merkle root accordion)
│   ├── my-works/          # User's minted works gallery
│   ├── actions.ts         # Server Actions (orchestration)
│   └── api/
│       ├── works/         # CRUD for db.json
│       ├── users/login/   # User login
│       ├── storage/
│       │   ├── upload/    # Multipart upload to 0G Storage
│       │   └── download/  # Download from 0G Storage by Merkle Root
│       └── compute/
│           └── status/    # Compute ledger status + deposit endpoint
├── components/            # React components
│   ├── app-shell.tsx      # App layout shell
│   ├── providers.tsx      # RainbowKit + Wagmi providers
│   ├── client-root.tsx    # Client-side root wrapper
│   ├── wallet-gate.tsx    # Wallet connection gate
│   ├── session-sync.tsx   # Session sync with db.json
│   ├── certificate-card.tsx  # Certificate display card
│   ├── my-works.tsx       # My Works gallery
│   ├── wow-moment.tsx     # Pixel-tampering verification demo
│   └── compute-status.tsx # 0G Compute network status panel (accordion)
├── agent/                 # Autonomous Telegram Agent
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
│       ├── nlp.ts         # 0G Compute NLP + Function Calling integration
│       ├── telegram.ts    # Telegram image download
│       ├── format.ts      # Message formatting
│       ├── pdf.ts         # Certificate PDF generation
│       └── tools.ts       # Agent tool definitions
├── contracts/             # Solidity contracts
│   └── ChainRightERC721.sol
├── lib/                   # Utilities and SDK wrappers
│   ├── storage.ts        # 0G Storage wrapper
│   ├── compute.ts        # 0G Compute wrapper (generate, edit, chat)
│   ├── contract.ts       # ethers v6 wrapper
│   ├── certificate-pdf.ts # jspdf certificate PDF generation
│   ├── openai.ts         # OpenAI fallback (deprecated)
│   ├── db.ts             # db.json persistence
│   ├── utils.ts          # Shared utilities
│   ├── wallet-config.ts  # RainbowKit + Wagmi config
│   ├── types.ts          # TypeScript interfaces
│   └── abi/              # Contract ABIs
│       └── ChainRightERC721.abi.ts
├── scripts/               # Deploy + debug scripts
├── pivot-docs/            # Pivot documentation (reference)
├── hardhat.config.ts      # Hardhat config (evmVersion: cancun)
├── .env.example           # Environment variables
├── product.md             # ARZ Lite — product
├── stack.md               # ARZ Lite — stack
├── spec.md                # ARZ Lite — spec
├── userflow_*.md          # ARZ Lite — userflows
└── AGENTS.md              # Project orchestration
```

## Environment Variables

| Variable | Value for demo |
|---|---|
| `PRIVATE_KEY` | Private wallet for deploy, server actions, agent (never commit) |
| `NEXT_PUBLIC_RPC_URL` | `https://evmrpc-testnet.0g.ai` |
| `NEXT_PUBLIC_CHAIN_ID` | `16602` |
| `NEXT_PUBLIC_STORAGE_INDEXER` | `https://indexer-storage-testnet-turbo.0g.ai` |
| `RPC_URL` | `https://evmrpc-testnet.0g.ai` (server-side) |
| `STORAGE_INDEXER` | `https://indexer-storage-testnet-turbo.0g.ai` (server-side) |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0xfca49910C81355eE3787e4E87F16a18E593bedB0` (v3) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather (for agent) |

**Deprecated vars (no longer needed):**
- ~~`DEEPSEEK_API_KEY`~~ — Agent uses 0G Compute qwen-2.5-7b instead
- ~~`OPENAI_API_KEY`~~ — No fallback to OpenAI required
- ~~`PROVIDER_ADDRESS`~~ — Providers are auto-discovered

## Commands

- Dev frontend: `npm run dev`
- Run agent: `npm run agent`
- Build: `npm run build`
- Compile contracts: `npm run compile`
- Deploy to testnet: `npx hardhat run scripts/deploy.ts --network 0g-testnet`

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

## Critical Rules

### ALWAYS:
- Call `processResponse()` AFTER EVERY inference
- Correct parameter order: `processResponse(providerAddress, chatID, usageData)`
- Extract ChatID from `ZG-Res-Key` header FIRST
- Use `evmVersion: "cancun"` for ALL contracts
- Use ethers **v6** (never v5)
- Close `ZgFile` with `file.close()` in `finally` block
- Private keys ONLY from `.env`

### NEVER:
- Skip `processResponse()` (locks funds)
- Invert `processResponse()` parameter order
- Hardcode private keys
- Lose the Merkle Root

## Auto-Funding Strategy

All 0G Compute operations (generate, edit, chat) have automatic fund management:

1. First attempt: send request directly
2. If provider returns "insufficient balance" or "minimum reserve":
   - **Image ops** (generate/edit): transfer 0.1 0G from ledger to provider sub-account, retry
   - **Chatbot** (agent NLP): deposit 0.1 0G from on-chain wallet to ledger, retry
3. If transfer fails (low ledger balance), return error

## Storage Upload Transport

- Saving to 0G Storage: `POST /api/storage/upload` (multipart/form-data)
- Download for verification: `POST /api/storage/download` (by Merkle Root)
- Format: `https://storagescan-galileo.0g.ai/submission/[txSeq]`
- Server Actions `bodySizeLimit: "8mb"` in `next.config.ts`

## MVP Persistence

- `db.json` for users and works
- Endpoints: `POST /api/users/login`, `GET/POST /api/works`
- Agent state: `agent-state.json` + `agent-log.json` synced to 0G Storage every 5 ops

## What we are NOT Building

- No personal NFT gallery — only create and verify
- No transfers between users
- No royalties or secondary sales
- No full history — only on-chain
- No metadata editing — immutable by design
