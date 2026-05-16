# Pivot — Impact Analysis

## What Changed

| Aspect | Before | After |
|---|---|---|
| **Image Editing** | ❌ Not supported | ✅ `qwen/qwen-image-edit-2511` via 0G Compute |
| **Agent NLP** | DeepSeek API (centralized) | 0G Compute `qwen-2.5-7b-instruct` (decentralized) |
| **Auto-Funding** | Not implemented | Auto-deposit from on-chain wallet to ledger on insufficient balance |
| **Compute Status** | Large verbose panel | Collapsed accordion with balance + model |
| **Gallery Edit** | Not supported | "Edit with AI" button on gallery works |
| **Dual Certificate** | Single NFT mint | Parent-child provenance chain |
| **Auth for images** | JSON body | Multipart/form-data (required by provider) |

## Files Changed

**New files:**
- `app/api/storage/download/route.ts` — Download from StorageScan by Merkle Root
- `app/api/compute/status/route.ts` — Compute status + deposit endpoint
- `components/compute-status.tsx` — Compute network status UI
- `scripts/fund-chatbot.ts` — One-time chatbot provider funding
- `scripts/check-balance.ts`, `check-providers.ts`, `debug-transfer.ts` — Debug utilities

**Modified files:**
- `lib/compute.ts` — `generateImage()`, `editImage()` (multipart), `chatCompletion()`, auto-deposit
- `app/create/page.tsx` — Edit flow, stored_edit step, dual certificate
- `app/my-works/page.tsx` — Gallery with Edit button
- `app/verify/page.tsx` — Parent chain accordion
- `app/actions.ts` — `actionEditImage()`, `actionMintProvenanceWithChain()`
- `agent/utils/nlp.ts` — Replaced DeepSeek with 0G Compute
- `agent/bot.ts` — Updated for 0G Compute
- `lib/contract.ts` — `mintProvenanceWithChain()` with parentTokenId
- `lib/types.ts` — Types for compute, chat, editing
- `contracts/ChainRightERC721.sol` — v3 with merkleRootOriginal, parentTokenId

## Contract Versions

| Version | Address | Notes |
|---|---|---|
| v3 (active) | `0xfca49910C81355eE3787e4E87F16a18E593bedB0` | Full parent-child provenance |
| v2 (legacy) | `0xE76B9fcbf59B4eBE7CE6c41939BA68D65c65Bb44` | Deprecated |
| v1 (legacy) | `0x4424d49ED6d3748980FFfB0ba0b2a4e92db4Ed05` | Deprecated |

## Bill of Materials

| Service | Provider | Min. Reserve |
|---|---|---|
| Text-to-Image (Flux Turbo) | `0x...` | 1.0 0G |
| Image Editing (qwen-image-edit-2511) | `0x4b2a9419...` | 1.0 0G |
| Chatbot (qwen-2.5-7b-instruct) | `0xa48f0128...` | 1.0 0G |

## Costs

| Operation | Est. Cost |
|---|---|
| Image generation (Flux) | ~0.003 0G |
| Image edit (qwen-image-edit-2511) | ~0.003 0G |
| Chat query (qwen-2.5-7b, think + respond) | ~0.0000003 0G |
| 0G Storage upload | ~0.0001 0G |
