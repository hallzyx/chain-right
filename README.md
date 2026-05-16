# ChainRight

> **Verifiable AI Provenance on 0G.** Generate, register, edit with AI, store, mint, and verify — all on the 0G decentralized network.  
> Built for the 0G Hackathon 2026 — Track 2: Autonomous Agents.

---

## Table of Contents

- [Overview](#overview)
- [0G Product Usage](#0g-product-usage)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Design System](#design-system)
- [Deployed Contracts](#deployed-contracts)
- [Commands](#commands)
- [Documentation Index](#documentation-index)

---

## Overview

ChainRight gives every AI-generated image a permanent, verifiable birth certificate on 0G. Cryptographic proof of authorship, forever.

### What it does

| Mode | Description |
|---|---|
| **Web App** | Next.js 15 frontend. Generate (Flux Turbo), Register Original (upload only), AI Edit (qwen-image-edit-2511) → store on 0G Storage → mint NFT on 0G Chain → verify authenticity with Wow Moment. |
| **Telegram Agent** | Autonomous AI agent with **0G Compute NLP** (qwen-2.5-7b-instruct). Natural language verification — send an image, ask "is this real?", get full provenance + PDF certificate. No external APIs. |

### 0G Layers Used

- **0G Compute** — Flux Turbo (text-to-image), qwen-image-edit-2511 (AI editing), qwen-2.5-7b (agent NLP)
- **0G Storage** — Merkle-proof file storage + KV/Log for agent persistent memory
- **0G Chain** — ChainRightERC721 NFT (v3) with parent-child provenance chain

---

## 0G Product Usage

### 0G Compute

| Service | File | Line | Usage |
|---|---|---|---|
| **Flux Turbo** (text-to-image) | [`lib/compute.ts`](./lib/compute.ts) | 377 | `generateImage()` — sends prompt + model to `/images/generations`, receives `b64_json` |
| **qwen-image-edit-2511** (AI edit) | [`lib/compute.ts`](./lib/compute.ts) | 519 | `editImage()` — sends image + prompt via multipart/form-data to `/images/edits` |
| **qwen-2.5-7b-instruct** (agent NLP) | [`lib/compute.ts`](./lib/compute.ts) | 750 | `chatCompletion()` — sends messages + tools to `/chat/completions`, supports function calling |
| **Provider discovery** | [`lib/compute.ts`](./lib/compute.ts) | 175 | `discoverProviders()` — discovers providers by service type |
| **Account management** | [`lib/compute.ts`](./lib/compute.ts) | 220 | `depositFund()`, `transferToProvider()` — manages 3-layer fund flow |

> **Key detail:** All 3 operations include `processResponse()` after inference (mandatory for fee settlement), auto-funding on insufficient balance, and ZG-Res-Key extraction from response headers.

### 0G Storage

| Feature | File | Line | Usage |
|---|---|---|---|
| **File upload** | [`lib/storage.ts`](./lib/storage.ts) | 165 | `uploadFile()` — creates ZgFile, generates Merkle tree, uploads via Indexer, returns Merkle Root + txSeq |
| **Upload API** | [`app/api/storage/upload/route.ts`](./app/api/storage/upload/route.ts) | 1 | `POST /api/storage/upload` — multipart upload endpoint for web app |
| **Download API** | [`app/api/storage/download/route.ts`](./app/api/storage/download/route.ts) | 1 | `POST /api/storage/download` — downloads by Merkle Root, returns base64 data URL |
| **Agent memory** | [`agent/memory/0g-kv.ts`](./agent/memory/0g-kv.ts) | 123 | `uploadBuffer()` — syncs agent state/JSON to 0G Storage every 5 verifications |
| **Agent memory restore** | [`agent/memory/0g-kv.ts`](./agent/memory/0g-kv.ts) | 57 | `downloadFile()` — restores agent state from 0G Storage on startup |

### 0G Chain

| Feature | File | Line | Usage |
|---|---|---|---|
| **Smart contract** | [`contracts/ChainRightERC721.sol`](./contracts/ChainRightERC721.sol) | 1 | ChainRightERC721 v3 — ProvenanceRecord struct with `merkleRootOriginal`, `parentTokenId` |
| **Mint with chain** | [`lib/contract.ts`](./lib/contract.ts) | 270 | `mintProvenanceWithChain()` — mints NFT with parent-child provenance linkage |
| **Provenance query** | [`lib/contract.ts`](./lib/contract.ts) | 92 | `getProvenance()` — reads on-chain provenance record by Merkle Root |
| **Token query** | [`lib/contract.ts`](./lib/contract.ts) | 128 | `getProvenanceByToken()` — reads by Token ID |
| **Verification** | [`lib/contract.ts`](./lib/contract.ts) | 164 | `verifyProvenance()` — full verification flow for web app and agent |
| **Event query** | [`lib/contract.ts`](./lib/contract.ts) | 190 | `getTokenIdAndTxByMerkleRoot()` — filters ProvenanceMinted events for ChainScan links |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your keys (PRIVATE_KEY + TELEGRAM_BOT_TOKEN)

# 3. Run the web app
npm run dev

# 4. Run the Telegram agent (separate terminal)
npm run agent
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PRIVATE_KEY` | ✅ | Wallet private key for 0G transactions (deploy, server actions, agent) |
| `TELEGRAM_BOT_TOKEN` | ✅ (for agent) | Telegram bot token from @BotFather |
| `NEXT_PUBLIC_RPC_URL` | ✅ | 0G Chain RPC (`https://evmrpc-testnet.0g.ai`) |
| `NEXT_PUBLIC_CHAIN_ID` | ✅ | `16602` (Galileo Testnet) |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | ✅ | v3: `0xfca49910C81355eE3787e4E87F16a18E593bedB0` |
| `NEXT_PUBLIC_STORAGE_INDEXER` | ✅ | `https://indexer-storage-testnet-turbo.0g.ai` |

> **Note:** `DEEPSEEK_API_KEY` and `OPENAI_API_KEY` are **no longer required**. Agent NLP runs on 0G Compute. No external APIs.

---

## Project Structure

```
chainright/
├── app/                    # Next.js App Router (web app)
│   ├── create/            # Generate, Register Original, AI Edit flow
│   ├── verify/            # Verify authenticity + Wow Moment
│   ├── my-works/          # User's minted works gallery (with Edit button)
│   └── api/               # API routes (storage, compute, works, users)
├── agent/                  # Autonomous Telegram Agent (standalone tsx process)
│   ├── bot.ts             # Entrypoint — Function Calling loop
│   ├── handlers/          # verify, start, help, stats
│   ├── memory/            # KV state, Log history, 0G Storage sync
│   └── utils/             # NLP (0G Compute), PDF, Telegram, tools
├── components/            # React components (Black & Amber design)
├── contracts/             # ChainRightERC721.sol (v3)
├── lib/                   # 0G SDK wrappers (compute, storage, contract)
├── scripts/               # Deploy + debug scripts
├── pivot-docs/            # Pivot implementation documentation
├── product.md             # Product vision and features
├── stack.md               # Technology stack and dependencies
├── spec.md                # Technical architecture and decisions
├── ARCHITECTURE.md        # Visual architecture diagrams and fund flow
├── userflow_*.md          # Detailed user flow documentation
└── .env.example           # Environment variables template
```

---

## Architecture

### 3-Layer Fund Flow

```
Wallet (on-chain) → Compute Ledger → Provider Sub-accounts (reserve + consumption)
```

Each provider requires **1.0 0G minimum reserve**. Auto-funding handles insufficient balance.
See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full fund flow diagram.

### Compute Flow Types

| Operation | Endpoint | Request Format | Auth Body |
|---|---|---|---|
| Text-to-Image | `/images/generations` | JSON | `JSON.stringify(body)` |
| Image Editing | `/images/edits` | multipart/form-data | `""` (empty) |
| Chat (Agent NLP) | `/chat/completions` | JSON | `JSON.stringify(body)` |

All include `processResponse()` for fee settlement and auto-retry on insufficient balance.

---

## Design System

**Black & Amber Edition** — extracted from Stitch (Google's AI design tool).

- Background: `#0A0A0A`, Accent: `#F59E0B` (Amber)
- Fonts: Newsreader (serif) + Inter (sans)
- Shapes: 0px corners — sharp, architectural
- No shadows, no gradients — tonal layers only

---

## Deployed Contracts

| Contract | Network | Address |
|---|---|---|
| ChainRightERC721 **v3** (active) | 0G Testnet | `0xfca49910C81355eE3787e4E87F16a18E593bedB0` |
| ChainRightERC721 v2 (legacy) | 0G Testnet | `0xE76B9fcbf59B4eBE7CE6c41939BA68D65c65Bb44` |

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server (port 3000) |
| `npm run agent` | Start Telegram verification agent (independent process) |
| `npm run build` | Build Next.js for production |
| `npm run compile` | Compile Solidity contracts |
| `npx hardhat run scripts/deploy.ts --network 0g-testnet` | Deploy to 0G Testnet |

---

## Documentation Index

| File | Description |
|---|---|
| [`product.md`](./product.md) | Product vision — features, demo flow, agent, all 13 capabilities |
| [`spec.md`](./spec.md) | Technical architecture — 0G Compute ops, fund flow, contract v3, key decisions |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Visual diagrams — system layers, data flows, fund architecture, components |
| [`stack.md`](./stack.md) | Technology stack — deps, env vars, network config, critical rules |
| [`userflow_generate_and_Mint_artwork.md`](./userflow_generate_and_Mint_artwork.md) | Generate + Register Original — prompt, upload, store, mint, certificate |
| [`userflow_ai_edit_artwork.md`](./userflow_ai_edit_artwork.md) | AI Edit — 0G Compute qwen-image-edit-2511, parent-child chain, dual cert |
| [`userflow_verify_artwork.md`](./userflow_verify_artwork.md) | Verify — upload, 5-step analysis, wow moment, hash diff |
| [`userflow_agent_verify.md`](./userflow_agent_verify.md) | Agent — 0G Compute NLP, tool calling, memory sync, PDF delivery |
| [`AGENTS.md`](./AGENTS.md) | AI assistant orchestration — skills, rules, 0G critical patterns |
| [`.stitch/DESIGN.md`](./.stitch/DESIGN.md) | Black & Amber design system (from Google Stitch) |
| [`pivot-docs/impact-analysis.md`](./pivot-docs/impact-analysis.md) | Pivot impact — files changed, contracts, costs, bill of materials |

---

## License

MIT — Built for the 0G Hackathon 2026.
