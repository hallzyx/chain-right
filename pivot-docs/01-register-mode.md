# Pivot 01 — Register Mode (Upload + Provenance)

> **What:** A new "Register Only" workflow where artists upload an original image (no AI involved) and receive an immutable on-chain provenance certificate.
>
> **Why:** The Supreme Court's *Thaler v. Perlmutter* ruling (March 2026) confirmed that copyright requires proof of human authorship. ChainRight becomes the infrastructure that makes that proof provable.

---

## The User Flow

1. User opens ChainRight and selects **"Register Artwork"**
2. User uploads their original image (PNG/JPG/WEBP)
3. User clicks **"Register without AI"**
4. System computes SHA-256 + Merkle Root of the image
5. System uploads the image to **0G Storage** → captures `txSeq`
6. System mints a **ProvenanceRecord NFT** on 0G Chain with:
   - `merkleRoot` — cryptographic fingerprint of the image
   - `model` → `"none"` (no AI involved)
   - `prompt` → `""` (empty)
   - `txSeq` — on-chain storage reference
   - `timestamp` — block timestamp
   - `creator` — wallet address
7. **Certificate of Authorship** displayed with:
   - Token ID, Merkle Root, timestamp, creator
   - StorageScan link
   - Downloadable PDF certificate

---

## What Changes in the Code

| File | Change |
|---|---|
| `app/create/page.tsx` | Add "Register without AI" button next to existing flow. Skip compute entirely. |
| `lib/contract.ts` | Mint with `model: "none"`, `prompt: ""` — already supported by v2 contract. |
| `lib/types.ts` | No changes needed — provenance struct already handles empty fields. |
| `contracts/ChainRightERC721.sol` | No changes needed — already stores model/prompt as strings. |

---

## 0G Components Used

| Layer | Usage |
|---|---|
| **0G Storage** | Upload original image → Merkle Root + txSeq |
| **0G Chain** | Mint ProvenanceRecord NFT with empty AI fields |

---

## Why This Matters

This is the legal foundation. Before any AI touches an artwork, the human-created original is timestamped and registered on-chain. Future AI edits will link back to this record via `parentTokenId`.
