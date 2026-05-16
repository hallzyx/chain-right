# Pivot 02 — AI Edit Mode (Register + Edit Chain)

> **What:** After registering an original work (Mode 1), artists can use 0G Compute's `qwen/qwen-image-edit-2511` to edit the image with AI and register the result as a **second linked ProvenanceRecord**.
>
> **Why:** Human authorship + AI assistance creates a provable creative chain. The Supreme Court explicitly distinguished *"artists who CREATE with AI assistance"* from *"AI that creates autonomously"*. ChainRight proves which one happened.

---

## The User Flow

1. User has already registered the original image (ProvenanceRecord #1)
2. User writes an **edit prompt**: *"cyberpunk style with neon lights"*
3. User clicks **"Edit with AI"**
4. System discovers `image-edit` providers on 0G Compute
5. System verifies balance, transfers funds if needed
6. System executes inference: `qwen/qwen-image-edit-2511` (original image + edit prompt)
7. System calls `processResponse()` for fee settlement
8. System captures `ZG-Res-Key` from response header
9. System displays the **edited image** with provenance data:
   - ZG-Res-Key (unique inference ID)
   - Provider address
   - Model: `qwen/qwen-image-edit-2511`
   - Edit prompt used
   - Link to the original ProvenanceRecord #1
10. User clicks **"Save & Mint NFT"**
    - Uploads edited image to 0G Storage → captures `txSeq_edited`
    - Mints **ProvenanceRecord #2** with:
      - `merkleRootEdited` — hash of the AI result
      - `editPrompt` — exact instruction given to the AI
      - `model` — `"qwen/qwen-image-edit-2511"`
      - `zkResKey` — unique inference ID from 0G Compute TEE node
      - `parentTokenId` — Token ID of the original record (NFT #1)
      - `txSeq` — on-chain storage reference
      - `timestamp`, `creator`
11. **Certificate of Authorship** shows the full chain:
    - Original record + AI-edited record side by side
    - "Based on original work #884,209,112" link
    - All explorer links for both records
    - Downloadable PDF with full lineage

---

## What Changes in the Code

| File | Change |
|---|---|
| `lib/compute.ts` | Add `image-edit` service type. Current code only handles `text-to-image`. Need to adapt for `qwen/qwen-image-edit-2511` which sends image + text → image. |
| `lib/types.ts` | Add `editPrompt`, `parentTokenId`, `merkleRootOriginal` to types. |
| `lib/contract.ts` | Mint with new struct fields. May need contract upgrade or new contract version. |
| `contracts/ChainRightERC721.sol` | **New version (v3):** Add `parentTokenId`, `editPrompt`, `merkleRootOriginal` to `ProvenanceRecord`. |
| `app/create/page.tsx` | Add AI edit step between upload and mint. Two-phase mint (original → edit → mint edited). |
| `app/verify/page.tsx` | Show parent chain if `parentTokenId` exists in verification result. |

---

## Flow Diagram

```
[Original Image] ──→ Upload ──→ 0G Storage ──→ Mint NFT #1
                                                    │
                [Edit Prompt]                        │
                      │                              │
                      ▼                              ▼
              0G Compute ──→ Edited Image ──→ Upload ──→ Mint NFT #2
              (qwen-image-     (ZG-Res-Key)     (txSeq)   (parentTokenId:
               edit-2511)                                     NFT #1)
```

---

## 0G Components Used

| Layer | Usage |
|---|---|
| **0G Compute** | `qwen/qwen-image-edit-2511` — TEE-verified image editing |
| **0G Storage** | Store both original and edited images → 2 Merkle Roots + 2 txSeq |
| **0G Chain** | Mint 2 ProvenanceRecords linked via `parentTokenId` |

---

## Smart Contract Changes (v3)

The new `ProvenanceRecord` adds:

```solidity
struct ProvenanceRecord {
    bytes32 merkleRoot;
    bytes32 merkleRootOriginal;    // NEW — links to the pre-edit image
    string zkResKey;
    string prompt;                  // edit prompt
    string model;                   // e.g. "qwen/qwen-image-edit-2511"
    string sequenceNumber;
    uint256 parentTokenId;          // NEW — link to original NFT
    uint256 timestamp;
    address creator;
    bool exists;
}
```

For Mode 1 (no AI): `merkleRootOriginal = 0`, `prompt = ""`, `model = "none"`, `parentTokenId = 0`.
For Mode 2 (AI edit): all fields populated + `parentTokenId` pointing to the original.
