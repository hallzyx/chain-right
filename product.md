# ChainRight
> Prove human authorship in the age of AI. Register your original work, create with AI assistance, and own the cryptographic evidence — forever on 0G.

## The Problem

When you create art — whether by hand, with AI assistance, or both — you have no way to prove:
- That YOU were the one who created it
- ON WHAT DATE you created it
- What was human-made vs what was AI-assisted

The Supreme Court's *Thaler v. Perlmutter* ruling (March 2026) confirmed: copyright requires proof of human authorship. ChainRight gives you that proof.

AI is a tool, not the creator. ChainRight proves you were the one holding the brush — analog or digital.

## Target Audience

- Digital artists who create by hand AND use AI tools
- Writers/authors who generate cover art with AI
- Content creators who want copyright-grade proof of authorship
- Anyone who wants to prove "I made this" in a world where AI can make anything

## Why Now

1. **AI art is mainstream** — but copyright law now demands proof of human authorship
2. **"Made with AI" isn't enough** — you need to prove what was yours vs. what was the machine's
3. **The Supreme Court ruling** — changed everything. Without proof, your work has no legal protection
4. **0G delivers the infrastructure** — Compute (TEE-verified) + Storage (Merkle proofs) + Chain (immutable records)

## The Solution

ChainRight anchors your creative process to the 0G blockchain with a permanent, verifiable record:

### Three Ways to Prove Authorship

| Mode | What it proves | How |
|---|---|---|
| **Register Original** | "I made this by hand" | Upload any image → store on 0G Storage → mint NFT. No AI involved. |
| **AI Edit** ⭐ | "I made the original, AI helped me remix it" | Take a registered original → edit with 0G Compute (qwen-image-edit-2511) → mint a second NFT linked to the first via `parentTokenId`. This is the core proof: human authorship + AI assistance. |
| **Generate with AI** | "I directed this creation" | Prompt → Flux Turbo → store → mint. Secondary creation mode when AI generation is preferred. |

### What Gets Recorded On-Chain

- **Merkle Root** — cryptographic fingerprint of the file (change 1 pixel → hash destroyed)
- **ZG-Res-Key** — unique inference ID from 0G Compute TEE node
- **Prompt / Edit Instruction** — exact text you gave the AI
- **Model** — which AI model was used ("none" for original works)
- **Sequence Number** (txSeq) — 0G Storage submission reference
- **parentTokenId** — links edited works to their human-created original
- **Timestamp + Creator** — immutable block timestamp + your wallet

Anyone, at any time, can verify the full creative chain: human → AI → proof.

## The Demo Flow

### Homepage
Two options: **"Create Artwork"** or **"Verify Authenticity"**

### Create Flow

**Mode 1 — Register Original (Human Authorship)**
1. Select "Register Artwork" → upload image → "Register on 0G Storage" → "Mint NFT"
2. Certificate shows: this work exists, was created by you, at this timestamp, with no AI

**Mode 2 — AI Edit ⭐ (Human Base + AI Remix — core feature)**
1. From an already-registered work, write edit prompt → qwen-image-edit-2511 edits it
2. Store edited image → mint second NFT with `parentTokenId` linking to original
3. Dual certificate: "This AI edit was based on original work #[tokenId]" — proves human authorship + AI assistance

**Mode 3 — Generate (AI-Directed Creation)**
1. Write prompt → Flux Turbo generates image → store → mint

### Verify Flow
Upload any image → 5-step on-chain analysis → ✅ Authentic / ❌ No Record Found → Wow Moment

### Telegram Agent
Send an image + "verify this" → 0G Compute NLP (qwen-2.5-7b) autonomously verifies on-chain → returns full provenance + PDF certificate

## Features

| # | Feature | Status |
|---|---|---|
| 1 | **Register Original** — upload image, prove human authorship | ✅ |
| 2 | **AI Edit** ⭐ — qwen-image-edit-2511, parent-child provenance chain | ✅ |
| 3 | **Generate with AI** — Flux Turbo via 0G Compute | ✅ |
| 4 | Store on 0G Storage with Merkle proof + txSeq | ✅ |
| 5 | Mint NFT with full provenance on 0G Chain (v3) | ✅ |
| 6 | Verify authenticity (5-step real-time on-chain analysis) | ✅ |
| 7 | Wow Moment — 1-pixel change → hash destroyed, visualized | ✅ |
| 8 | Certificate of Authorship with 3 explorer links | ✅ |
| 9 | PDF Certificate download for legal proof | ✅ |
| 10 | "My Works" personal gallery with Edit button | ✅ |
| 11 | Telegram Verification Agent (0G Compute NLP) | ✅ |
| 12 | Agent persistent memory via 0G Storage KV/Log | ✅ |

## Contract

| Version | Address | Notes |
|---|---|---|
| **v3 (active)** | `0xfca49910C81355eE3787e4E87F16a18E593bedB0` | Full parent-child provenance |
| v2 (legacy) | `0xE76B9fcbf59B4eBE7CE6c41939BA68D65c65Bb44` | Deprecated |

## The Pitch Line

"You created it. AI helped. ChainRight proves it."

## Why 0G

This is impossible without 0G's properties:

1. **Permanence** — The record never gets erased or modified
2. **Verifiability** — Anyone can verify without asking permission
3. **TEE + Chain** — 0G Compute runs in a TEE, and the result is registered on-chain
