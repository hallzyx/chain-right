# Brief — ChainRight

> **Verifiable Provenance for AI-Generated Images on 0G.**  
> Hackathon 2026 · Track 2: Autonomous Agents & Swarms

---

## One-Liner

ChainRight gives every AI-generated image an immutable cryptographic birth certificate on the 0G decentralized network, verifiable by anyone, anywhere — including via an autonomous Telegram agent with natural language understanding.

---

## The Problem

When you generate images with AI tools (Midjourney, DALL-E, Flux), you can't prove:
- That **you** created it
- **When** you created it
- With what **prompt** and **model**

A viral AI artwork can be copied by anyone. The original creator has zero proof. There's no equivalent of a copyright registration system for AI art. Until now.

---

## The Solution

ChainRight anchors every AI-generated image to the 0G blockchain with a complete, verifiable provenance record:

| Data Point | Source |
|---|---|
| Merkle Root (cryptographic fingerprint) | 0G Storage |
| ZG-Res-Key (inference ID) | 0G Compute |
| Prompt + Model | On-chain |
| Sequence Number (txSeq) | 0G Storage |
| Timestamp + Creator | 0G Chain block |

**Change one pixel → the entire Merkle Root changes.** Cryptographic impossibility to forge.

---

## Two Interfaces, One Protocol

### Web App (Next.js 15)
- **Create**: Prompt → Flux Turbo (0G Compute) → Store (0G Storage) → Mint NFT (0G Chain)
- **Verify**: Upload image → 5-step live analysis → ✅ Authentic / ❌ Not found → Wow Moment
- **My Works**: Personal gallery with Certificate of Authorship + PDF download

### Telegram Agent (Autonomous AI)
- Send an image + say "verify this" → agent autonomously verifies via DeepSeek Function Calling
- Natural language: "is this real?", "check authenticity", "show my stats"
- Returns full provenance + PDF certificate + ChainScan/StorageScan links
- Persistent memory via 0G Storage KV/Log

---

## 0G Components Used

| Component | Usage |
|---|---|
| **0G Compute** | TEE-verified Flux Turbo image generation |
| **0G Storage** | File storage (Merkle proofs) + KV/Log (agent persistent memory) |
| **0G Chain** | ChainRightERC721 NFT with full provenance struct |

---

## Why It Wins

1. **Solves a real problem** — AI art provenance is a growing crisis
2. **Uses all three 0G layers** — Compute, Storage, and Chain in one coherent flow
3. **Autonomous AI agent** — Function Calling, persistent memory, natural language
4. **Visual wow moment** — 1-pixel change destroys the hash, demonstrated live
5. **Premium design** — Black & Amber design system from Stitch

---

## Team

- **Name**: ChainRight Team
- **Hackathon Track**: 🤖 Best Autonomous Agents, Swarms & iNFT Innovations
- **Tech Stack**: TypeScript, Next.js 15, Solidity, grammY, DeepSeek
