# ChainRight

> **Verifiable AI Provenance on 0G.** Generate, store, mint, and verify — all on-chain.  
> Built for the 0G Hackathon 2026 — Track 2: Autonomous Agents.

---

## Overview

ChainRight gives every AI-generated image a permanent, verifiable birth certificate on the 0G decentralized network. Cryptographic proof of authorship, forever.

### What it does

| Mode | Description |
|---|---|
| **Web App** | Next.js 15 frontend. Generate AI images → store on 0G Storage → mint NFT on 0G Chain → verify authenticity with Wow Moment. |
| **Telegram Agent** | Autonomous AI agent with **DeepSeek Function Calling**. Natural language verification — send an image, ask "is this real?", get full provenance + PDF certificate. |

### 0G Layers Used

- **0G Compute** — TEE-verified Flux Turbo image generation
- **0G Storage** — Decentralized file storage with Merkle proofs + KV/Log persistent memory
- **0G Chain** — On-chain provenance registration via ChainRightERC721 NFT (3 deploys on testnet)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your keys (see .env.example)

# 3. Run the web app
npm run dev

# 4. Run the Telegram agent (separate terminal)
npm run agent
```

### Environment Variables

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather |
| `DEEPSEEK_API_KEY` | DeepSeek API key for agent NLP |
| `PRIVATE_KEY` | Wallet private key for 0G transactions |
| `NEXT_PUBLIC_RPC_URL` | 0G Chain RPC URL |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed ChainRightERC721 address |
| `NEXT_PUBLIC_STORAGE_INDEXER` | 0G Storage indexer endpoint |
| `OPENAI_API_KEY` | (Optional) OpenAI fallback for images |

---

## Project Structure

```
chainright/
├── app/                    # Next.js App Router (web app)
│   ├── create/            # Generate → Store → Mint
│   ├── verify/            # Verify authenticity + Wow Moment
│   ├── my-works/          # User's minted works gallery
│   └── page.tsx           # Landing page
├── agent/                  # Autonomous Telegram Agent
│   ├── bot.ts             # Entrypoint — Function Calling loop
│   ├── handlers/          # verify.ts, start.ts, help.ts, stats.ts
│   ├── memory/            # KV state, Log history, 0G Storage sync
│   └── utils/             # NLP (DeepSeek), PDF generation, Telegram API
├── components/            # React components (Black & Amber design)
├── contracts/             # ChainRightERC721.sol
├── lib/                   # 0G SDK wrappers, types, utilities
└── scripts/               # Hardhat deploy scripts
```

---

## Agent Architecture

```
User (Telegram) → DeepSeek Function Calling → Tool Execution → DeepSeek Response
                                                      │
                    ┌─────────────────────────────────┤
                    │                                 │
              verify_image                      show_help
              (Merkle + Chain)                  show_stats
                    │                           chat_reply
                    ▼
            0G Storage KV/Log (persistent memory)
```

The agent **autonomously decides** which tool to invoke using DeepSeek's function calling API. No hardcoded if/else — the LLM reasons about the user's intent and selects the right action.

---

## Design System

**Black & Amber Edition** — extracted from Stitch (Google's AI design tool).

- Background: `#0A0A0A` (Ink Black)
- Accent: `#F59E0B` (Amber / Gold foil)
- Fonts: Newsreader (serif headlines) + Inter (sans body)
- Shapes: Sharp 0px corners — no rounded, no shadows
- Depth: Tonal layers only (no borders, no gradients)

---

## Deployed Contracts

| Contract | Network | Address |
|---|---|---|
| ChainRightERC721 v2 | 0G Testnet | `0xE76B9fcbf59B4eBE7CE6c41939BA68D65c65Bb44` |

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run agent` | Start Telegram verification agent |
| `npm run build` | Build Next.js for production |
| `npm run compile` | Compile Solidity contracts |
| `npm run deploy:testnet` | Deploy contract to 0G Testnet |

---

## Documentation

| File | Description |
|---|---|
| [`brief.md`](./brief.md) | Executive pitch — problem, solution, why it wins |
| [`spec.md`](./spec.md) | Technical architecture, key decisions, file structure |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Visual architecture diagrams — data flows, components, 0G layers |
| [`product.md`](./product.md) | Full product vision — features, demo flow, agent capabilities |
| [`stack.md`](./stack.md) | Technology stack — dependencies, env vars, 0G network config |
| [`userflow_generar_mintear.md`](./userflow_generar_mintear.md) | Create flow — prompt, generate, store, mint, certificate |
| [`userflow_verificar.md`](./userflow_verificar.md) | Verify flow — upload, 5-step analysis, wow moment |
| [`userflow_agent_verify.md`](./userflow_agent_verify.md) | Agent flow — NLP, function calling, memory, PDF delivery |
| [`AGENTS.md`](./AGENTS.md) | Project orchestration — rules, skills, 0G critical patterns |
| [`.stitch/DESIGN.md`](./.stitch/DESIGN.md) | Black & Amber design system (from Google Stitch) |

---

## License

MIT — Built for the 0G Hackathon 2026.
