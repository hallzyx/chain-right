# Userflow — Generate and Mint Artwork

> **Contract v3**: `0xfca49910C81355eE3787e4E87F16a18E593bedB0` (0G Testnet)

## Actors

- Creator user
- 0G Compute Network (Flux Turbo for generation, qwen-image-edit-2511 for editing)
- 0G Storage Network
- 0G Chain (ChainRightERC721 v3 contract)

## Modes

### Mode A: Generate (Text-to-Image via Flux Turbo)

1. User enters a prompt → user clicks **"Generate with AI"**
2. System discovers `text-to-image` providers on 0G Compute
3. Auto-deposits/transfers funds if provider sub-account is low (retry logic)
4. System sends request to `flux-turbo` model via `/images/generations` (JSON body)
5. Response returns image as `b64_json`
6. System calls `processResponse(providerAddress, chatID)` for fee settlement
7. Captures `ZG-Res-Key` from response header
8. User clicks **"Register on 0G Storage"** → uploads image to 0G Storage → gets Merkle Root + txSeq
9. User clicks **"Mint NFT"** → mints ProvenanceRecord with:
   - `merkleRoot` — cryptographic fingerprint
   - `model` → `flux-turbo` or the model used
   - `prompt` → user's prompt
   - `zkResKey` → unique inference ID from 0G Compute TEE node
   - `sequenceNumber` → txSeq from 0G Storage
   - `timestamp`, `creator`

### Mode B: Register Original (Upload Only, No AI)

1. User selects **"Register Artwork"** → mode=`register`, step=`upload`
2. User uploads image file (PNG/JPG/WEBP) → local preview
3. User clicks **"Register on 0G Storage"** → uploads to 0G Storage, gets Merkle Root
4. User clicks **"Mint NFT"** → mints with `model="none"`, `prompt=""`, `zkResKey=""`
5. Certificate shows: Token ID, Merkle Root, timestamp, creator, StorageScan URL

---

## On-Chain Data (ChainRightERC721 v3)

```solidity
struct ProvenanceRecord {
    bytes32 merkleRoot;
    bytes32 merkleRootOriginal;     // parent work's Merkle Root (0 if no parent)
    string zkResKey;
    string prompt;
    string model;
    string sequenceNumber;
    uint256 parentTokenId;          // links to original NFT (0 if no parent)
    uint256 timestamp;
    address creator;
    bool exists;
}
```

- **Contract address (v3)**: `0xfca49910C81355eE3787e4E87F16a18E593bedB0`
- **Chain**: 0G Galileo Testnet (Chain ID: 16602)

---

## 0G Storage Upload Flow

```
POST /api/storage/upload → creates ZgFile → generates Merkle Tree
→ uploads via Indexer → returns merkleRoot + txSeq + StorageScan URL
```

- `txSeq` extracted from SDK response (field: `txSeq`, NOT `sequence`)
- StorageScan URL: `https://storagescan-galileo.0g.ai/submission/[txSeq]`
- ALWAYS close ZgFile in `finally` block

---

## processResponse() — MANDATORY

```typescript
let chatID = response.headers.get("ZG-Res-Key") || response.headers.get("zg-res-key");
if (chatID) {
  await broker.inference.processResponse(providerAddress, chatID, usageData);
}
```

- Provider address FIRST, chatID SECOND
- ChatID from header FIRST, body fallback only for chatbot
- For images: no usageData needed

---

## Minting

```typescript
mintProvenanceWithChain(merkleRoot, zkResKey, prompt, model, sequenceNumber, parentTokenId)
```

- For Mode B (no AI): `model="none"`, `zkResKey=""`, `prompt=""`, `parentTokenId=0`
- For AI edit: `parentTokenId` points to original NFT
- ethers v6 only (NEVER v5)
- `evmVersion: "cancun"` for contract compilation

---

## After Mint: AI Edit Option

After successful mint, `mode === "register" && step === "done"` shows:
- Certificate of authorship
- "Edit with AI" section → triggers [AI Edit flow](userflow_ai_edit_artwork.md)

---

## Auto-Funding

If provider returns "insufficient balance":
1. `tryInferenceWithRetry()` transfers 0.1 0G from compute ledger to provider sub-account
2. Retries the request with fresh auth headers
3. If transfer fails (ledger empty), returns error

---

## Acceptance Criteria

- [x] User can generate image via 0G Compute Flux Turbo
- [x] User can register original artwork (no AI)
- [x] `processResponse()` called after every inference
- [x] ChatID extracted from `ZG-Res-Key` header FIRST
- [x] Image stored on 0G Storage with valid Merkle Root
- [x] `ZgFile` properly closed in `finally` block
- [x] NFT minted via ChainRightERC721 v3 contract
- [x] Certificate shows all explorer links
- [x] ethers v6 only
- [x] `evmVersion: "cancun"`
