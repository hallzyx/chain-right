# Pivot 02 — AI Edit Mode (Register + Edit Chain)

> **What:** After registering an original work, users can edit it via 0G Compute's `qwen/qwen-image-edit-2511` and mint the result as a second linked ProvenanceRecord.
>
> **Why:** Human authorship + AI assistance creates a provable creative chain with parent-child lineage.

---

## The User Flow

1. User has already registered the original work (from gallery or just minted)
2. User writes an **edit prompt**: "cyberpunk style with neon lights"
3. User clicks **"Edit with AI"**
4. System discovers `image-editing` providers on 0G Compute
5. Downloads image (converts StorageScan URL to base64 if needed)
6. Sends **multipart/form-data** request to `/images/edits` with:
   - `model`: `qwen/qwen-image-edit-2511`
   - `image`: PNG file as Blob
   - `prompt`: edit instruction
   - `response_format`: `b64_json`
7. System calls `processResponse()` for fee settlement
8. Captures `ZG-Res-Key` from response header
9. Displays **Edited Artwork** with provenance data:
   - ZG-Res-Key, Provider address, Model, Edit prompt
   - Based on: Original work (Merkle Root)
10. User clicks **"Save & Mint Edited Version"**
    - Uploads edited image to 0G Storage → new Merkle Root
    - Mints **ProvenanceRecord #2** with:
      - `merkleRoot` — hash of edited image
      - `merkleRootOriginal` — parent work's Merkle Root
      - `prompt` — edit instruction
      - `model` — `"qwen/qwen-image-edit-2511"`
      - `zkResKey` — unique inference ID
      - `parentTokenId` — original NFT's token ID
      - `timestamp`, `creator`
11. **Certificate** shows:
    - New edited record + Original record side by side
    - Token IDs for both
    - Parent chain on `/verify` page

---

## Smart Contract v3 Changes

```solidity
struct ProvenanceRecord {
    bytes32 merkleRoot;
    bytes32 merkleRootOriginal;    // links to pre-edit image
    string zkResKey;
    string prompt;                  // edit prompt
    string model;                   // "qwen/qwen-image-edit-2511"
    string sequenceNumber;
    uint256 parentTokenId;          // link to original NFT
    uint256 timestamp;
    address creator;
    bool exists;
}
```

---

## Key Technical Details

| Aspect | Detail |
|---|---|
| **Endpoint** | `/images/edits` (requires **multipart/form-data**, not JSON) |
| **Auth signing** | Empty string (multipart boundary is dynamic) |
| **Auto-retry** | Transfers 0.1 0G from ledger to provider on insufficient balance |
| **Image format** | Provider returns `b64_json` (we request `response_format: "b64_json"`) |
| **Provider** | `0x4b2a941929E39Adbea5316dDF2B9Bd8Ff3134389` (TEE-verified) |

---

## What Was Implemented

| File | Changes |
|---|---|
| `lib/compute.ts` | `editImage()` — multipart FormData, auto-retry with fund transfer |
| `app/create/page.tsx` | Edit step flow: edit_prompt → editing → edited → stored_edit → minting_edit → done_edit |
| `app/my-works/page.tsx` | "Edit with AI" button on gallery items |
| `lib/contract.ts` | `mintProvenanceWithChain()` with parentTokenId |
| `contracts/ChainRightERC721.sol` | v3 contract with merkleRootOriginal, parentTokenId |
| `app/verify/page.tsx` | Parent chain accordion when parentTokenId > 0 |
| `components/compute-status.tsx` | Compute network status panel with balance, providers, deposit |

---

## 0G Components Used

| Layer | Usage |
|---|---|
| **0G Compute** | `qwen/qwen-image-edit-2511` — TEE-verified image editing |
| **0G Storage** | Store both original and edited images |
| **0G Chain** | Mint 2 ProvenanceRecords linked via parentTokenId |
