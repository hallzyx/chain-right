# Pivot 01 — Register Mode (Upload + Provenance)

> **What:** Two ways to register: "Generate" (text-to-image via 0G Compute Flux Turbo) or "Register Original" (upload existing image, no AI).
>
> **Why:** Human authorship + AI assistance creates a provable creative chain. ChainRight proves which one happened.

---

## Mode A: Generate (Text-to-Image)

1. User writes a prompt and selects **"Generate with AI"**
2. System discovers `text-to-image` providers on 0G Compute
3. Auto-deposits/transfers funds if provider sub-account is low
4. Sends request to `flux-turbo` via `/images/generations` (JSON, not multipart)
5. Response returns image as `b64_json`
6. System calls `processResponse()` for fee settlement
7. Captures `ZG-Res-Key` from response header
8. User clicks **"Register on 0G Storage"** → uploads to 0G Storage → Merkle Root
9. User clicks **"Mint NFT"** → mints ProvenanceRecord with model, prompt, zkResKey, sequenceNumber, merkleRoot, timestamp, creator

## Mode B: Register Original (Upload Only)

1. User selects **"Register Artwork"** → mode=`register`, step=`upload`
2. User uploads image file (PNG/JPG/WEBP) → local preview
3. User clicks **"Register on 0G Storage"** → uploads to 0G Storage, gets Merkle Root
4. Result shows: Merkle Root, txSeq, StorageScan URL
5. User clicks **"Mint NFT"** → mints with `model="none"`, `prompt=""`, `zkResKey=""`
6. **Certificate** shows: Token ID, Merkle Root, timestamp, creator, StorageScan link

---

## What Was Implemented

| File | Changes |
|---|---|
| `app/create/page.tsx` | Two modes: "Generate" (text-to-image) and "Register" (upload only) |
| `lib/compute.ts` | `generateImage()` — Flux Turbo via 0G Compute, `tryInferenceWithRetry()` for auto-funding |
| `lib/contract.ts` | `mintProvenanceWithChain()` — mints with all provenance fields |
| `lib/types.ts` | `ImageGenerationResult` interface |
| `app/my-works/page.tsx` | Gallery of registered works |

---

## 0G Components Used

| Layer | Usage |
|---|---|
| **0G Compute** | Flux Turbo text-to-image generation |
| **0G Storage** | Upload image → Merkle Root |
| **0G Chain** | Mint ProvenanceRecord NFT |
