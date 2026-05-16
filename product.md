# ChainRight
> Verifiable provenance for AI-generated images. Prove you are the original creator.

## The Problem

When you generate images with AI tools (Midjourney, DALL-E, Flux), you have no way to prove:
- That YOU were the one who generated that image
- ON WHAT DATE you generated it
- With what PROMPT and what exact MODEL

The problem is real: I created book covers with AI, they were successful, but now people are using them for other things without my authorization. And since it's AI, I truly can't do anything to prove originality.

Today, anyone can copy your image, claim it as their own, and no one could prove otherwise. AI images have no "birth certificate."

## Target Audience

- Digital artists using AI
- Writers/authors generating cover art
- Content creators who need to prove authorship
- NFT collectors who want real authenticity

## Why Now

1. AI image generation is mainstream — millions of images are created every day
2. The problem of theft and forgery is growing exponentially
3. 0G delivers the necessary technology: Compute (TEE-verified) + Storage (Merkle proofs) + Chain (EVM) — all natively integrated
4. No current solution combines AI + verifiable on-chain provenance natively

## The Solution

ChainRight gives every AI-generated image a public, permanent, and verifiable provenance record stored entirely on 0G:

1. **Generate** the image via 0G Compute (Flux Turbo, TEE-verified node) or **upload** an original artwork
2. **Edit** with AI via 0G Compute (qwen-image-edit-2511) — creates a parent-child provenance chain
3. **Store** the image on 0G Storage → Merkle Root + txSeq
4. **Register** on 0G Chain by minting an NFT containing the full provenance record:
   - **Merkle Root** — unique cryptographic fingerprint
   - **ZG-Res-Key** — unique inference ID from 0G Compute
   - **Prompt** — exact text that generated the image
   - **Model** — AI model used (e.g., "Flux Turbo", "qwen-image-edit-2511", or "none" for originals)
   - **Sequence Number** (txSeq) — 0G Storage submission reference
   - **parentTokenId** — links edited works to their original (0 for originals)
   - **Timestamp** — block timestamp
   - **Creator** — wallet address

Anyone can verify:
- The image matches the registered Merkle Root
- The inference exists and was executed on the registered date
- The wallet that minted is the same that executed the inference

## The Demo Flow

### Homepage

Two options:
- **"Create Artwork"** — generate, register original, or AI edit an artwork
- **"Verify Authenticity"** — upload any image and verify it against the on-chain registry

### Create Flow (Generate → Store → Mint)

1. User writes a prompt and clicks **"Generate with AI"**
2. System discovers text-to-image providers on 0G Compute, executes Flux Turbo inference
3. Calls `processResponse()` for fee settlement
4. Displays generated image with: ZG-Res-Key, provider address, model, prompt
5. User clicks **"Save to 0G Storage"** → uploads image, gets Merkle Root + txSeq
6. User clicks **"Mint NFT"** → writes to ChainRightERC721 v3 contract with full provenance
7. **Certificate of Authorship** shows: Token ID, explorer links, PDF download

### Register Original (Upload Only, No AI)

1. User selects **"Register Artwork"**, uploads an image file
2. Clicks **"Register on 0G Storage"** → Merkle Root
3. Clicks **"Mint NFT"** → mints with `model="none"`, `zkResKey=""`, `prompt=""`

### AI Edit (after mint)

After minting, the user can **"Edit with AI"**:
1. Writes an edit prompt, system calls `qwen/qwen-image-edit-2511` (multipart/form-data)
2. Captures ZG-Res-Key from response
3. Stores edited image to 0G Storage, mints a **second NFT** linked to the original via `parentTokenId`
4. Dual certificate shows both records side by side

### Verify Flow

1. User uploads an image on `/verify`
2. System computes Merkle Root, queries 0G Chain contract
3. Displays 5-step real-time analysis with live on-chain data
4. **Wow Moment**: modify one pixel → hash changes completely → split-screen diff

### Telegram Agent

Autonomous bot that verifies images via natural language. Uses **0G Compute** (qwen-2.5-7b-instruct) for NLP and function calling — no external APIs, no DeepSeek. See [agent userflow](userflow_agent_verify.md).

## Features

| # | Feature | Status |
|---|---|---|
| 1 | Generate image with AI (Flux Turbo via 0G Compute) | ✅ |
| 2 | Store image on 0G Storage with Merkle proof and txSeq | ✅ |
| 3 | Mint NFT with full provenance record on-chain (v3) | ✅ |
| 4 | Verify authenticity via Merkle Root (5-step analysis) | ✅ |
| 5 | Visual hash diff comparison (Wow Moment) | ✅ |
| 6 | Certificate of Authorship with explorer links | ✅ |
| 7 | PDF Certificate download for legal proof | ✅ |
| 8 | "My Works" personal gallery | ✅ |
| 9 | Manual verification by pasting Merkle Root | ✅ |
| 10 | Register Original (upload only, no AI) | ✅ |
| 11 | AI Edit with parent-child provenance chain | ✅ |
| 12 | **Telegram Verification Agent** (0G Compute NLP) | ✅ |
| 13 | Agent persistent memory via 0G Storage KV/Log | ✅ |

## Agent Architecture

```
User sends image + "verify this" on Telegram
        │
        ▼
0G Compute (qwen-2.5-7b) analyzes intent → calls verify_image tool
        │
        ▼
Agent downloads image, computes Merkle Root
        │
        ▼
Queries 0G Chain contract + events (tokenId, txHash)
        │
        ▼
0G Compute generates final response with ALL provenance details
        │
        ▼
Agent sends response + PDF certificate to user
```

### NLP

The agent uses **0G Compute** `qwen/qwen-2.5-7b-instruct` with OpenAI-compatible tool calling:
- `verify_image` — verify on-chain provenance
- `show_help` — display help
- `show_stats` — show user stats
- `chat_reply` — general conversation

Fallback to keyword matching if 0G Compute is unavailable. No external APIs required.

## Contract

| Version | Address | Notes |
|---|---|---|
| **v3 (active)** | `0xfca49910C81355eE3787e4E87F16a18E593bedB0` | Full parent-child provenance |
| v2 (legacy) | `0xE76B9fcbf59B4eBE7CE6c41939BA68D65c65Bb44` | Deprecated |
| v1 (legacy) | `0x4424d49ED6d3748980FFfB0ba0b2a4e92db4Ed05` | Deprecated |

## Wow Moment

The verification page features a cryptographic hash comparison:
1. **Split-screen**: original vs. 1-pixel-modified image (visually identical)
2. **Hash diff**: character-by-character comparison, green (match) / red (diff)
3. **Animated counter**: 100% → ~0% similarity
4. **Conclusion**: "Cryptographically impossible to forge"
