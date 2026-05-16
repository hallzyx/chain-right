# Userflow — Verify Authenticity

## Actors

- Verifier user (anyone)
- 0G Storage Network
- 0G Chain (ChainRightERC721 contract)

## Preconditions

- User has the image to verify (original or copy)
- ChainRightERC721 contract deployed on 0G Testnet (v3 with `parentTokenId` and `merkleRootOriginal` fields)

## Flow

### Step 1: User uploads the image

1. User navigates to the **"Verify Authenticity"** page
2. User clicks **"Click to upload an image"** or drag-and-drops the file
3. System shows the image preview

**System response:**
- Accepts any image format (PNG, JPG, WebP)
- Shows **"Verify Authenticity"** button enabled

### Step 2: Real-time 5-step analysis

User clicks **"Verify Authenticity"**

**System response — Live progress bar with 5 sequential phases:**

| Phase | What happens | Live data shown |
|---|---|---|
| **Step 1: Reading image file** | Reads the file buffer. | File size detected (e.g. `45.2 KB`, `120 bytes`). |
| **Step 2: Computing cryptographic fingerprint (Merkle Tree)** | Creates a `ZgFile` from temp file, generates Merkle Tree via `file.merkleTree()`, extracts `tree.rootHash()`, closes the file, cleans up temp file. | **Root hash** displayed character by character. |
| **Step 3: Connecting to 0G Chain** | Creates `ethers.JsonRpcProvider` (read-only, no wallet), fetches live network data. | RPC URL (`https://evmrpc-testnet.0g.ai`), Chain ID (`16602`), current block number from the live provider. |
| **Step 4: Querying smart contract** | Calls `getProvenance(merkleRoot)` on the contract (read-only). | Contract address (shortened), function selector shown (e.g. `getProvenance(0xabc12345...)`). |
| **Step 5: Result** | Interprets the contract response. | ✅ Match or ❌ No match. |

- Each phase transitions with a stagger animation for demo effect.
- A progress bar fills from 0% to 100% as phases complete.
- **Important**: The Merkle Root is UNIQUE per content. If you change A SINGLE PIXEL, the hash changes completely.

### Step 3: Result display with collapsible analysis

When the result phase completes, the 5 steps **collapse into an accordion**:

- Accordion header: **"▼ Show analysis process"** with a `5/5 completed` badge.
- User can expand to review all 5 steps with their live data.
- Progress bar shows 100% in green.

---

#### Case A: ✅ Authenticity Confirmed

If a record with that Merkle Root was found:

**Main result card:**
- Green card with large checkmark
- **"Authenticity Confirmed"**
- Explanatory message: "This image is registered on 0G Chain."

**On-chain provenance data section:**

| Field | Source |
|---|---|
| **Creator** | `record.creator` (wallet address, shortened) |
| **AI Model** | `record.model` (e.g. "Flux Turbo") |
| **Prompt** | `record.prompt` (full text) |
| **ZK Resource Key** | `record.zkResKey` |
| **Sequence (txSeq)** | `record.sequenceNumber` |
| **Timestamp** | `record.timestamp` formatted as locale date/time |

Plus:
- Contract address and block number reference in the provenance header.
- **"View on StorageScan"** link → `https://storagescan-galileo.0g.ai/submission/{sequenceNumber}`
- **"Download Certificate PDF"** button → generates a styled PDF with all provenance data, image, wallet, sequence number, and timestamp.

**Cryptographic Fingerprint section:**
- Shows the full Merkle Root in a code block.
- Note: "Unique hash. If you change A SINGLE PIXEL, it changes completely."

---

#### Case B: ❌ No Record Found

If no record exists for that Merkle Root:

**Main result card:**
- Red card with large X
- **"No Record Found"**
- Explanation for the user:
  - The creator never registered it on ChainRight
  - Or the image was generated AFTER the on-chain timestamp and doesn't match
  - Or it was modified (even by a single pixel)

### Step 4: Wow Moment — "Change ONE PIXEL"

After any result (match or no match), a button appears:
> **"🤯 View Wow Moment: Change ONE PIXEL"**

When clicked, it opens the **WowMoment** component:

**What happens:**
1. Modifies **1 byte** of the image file (`modifyOnePixel(originalData)`)
2. Recomputes the Merkle Root of the modified version

**Split-screen visual comparison:**
| Left (Original) | Right (Modified) |
|---|---|
| Label: "ORIGINAL" (green) | Label: "MODIFIED" (red) |
| Green pulsing dot overlay | Pink pulsing dot overlay |

- A **scan line animation** sweeps across both images simultaneously.

**Hash diff — character by character:**
| Left (Original Hash) | Right (Modified Hash) |
|---|---|
| Characters displayed in a grid | Same grid |
| Green background = character matches | Red background = character differs |

- Legend: green = match, red = different.

**Stats section (3 columns):**

| Chars Compared | Matching Chars | Cryptographic Similarity |
|---|---|---|
| Total character count | Count of matching characters | Animated counter that drops from ~XX% toward **0%** |

**Conclusion card:**
> "The hashes are **COMPLETELY DIFFERENT**"
>
> "This is why it is cryptographically impossible to forge a work registered on ChainRight. If you change a single byte of the file, the resulting hash won't match any on-chain record."
>
> "This is how SHA-256 + Merkle Trees work. The blockchain doesn't lie."

### Step 5: Manual verification

Below the upload section (visible when no verification is in progress):

> **"📜 Have a PDF certificate?"** — collapsible section.

When expanded:
- Text input field: **"Paste your Merkle Root"** (prefix `0x...`)
- **"Verify"** button
- Calls `getProvenance(merkleRoot)` directly on the contract (no image needed)
- Shows result inline:
  - ✅ Confirmed: displays creator, model, and sequence number
  - ❌ No record: shows error message

## Acceptance Criteria

- [x] User can upload any image
- [x] System computes the Merkle Root locally using 0G SDK
- [x] `ZgFile` is closed correctly in a `finally` block
- [x] System queries `getProvenance()` on ChainRightERC721 v3 on 0G Chain
- [x] 5-step analysis shows live on-chain data (file size, root hash, RPC URL, chain ID, block number, contract address)
- [x] When result appears, steps collapse into an accordion ("Show analysis process ▼")
- [x] If verified: shows full provenance data (creator, model, prompt, ZK Res Key, sequence number, timestamp)
- [x] If verified: shows "View on StorageScan" link and "Download Certificate PDF" button
- [x] If not verified: shows "No Record Found" with clear explanation
- [x] Wow Moment: modifying 1 byte changes the hash completely
- [x] Wow Moment: split-screen comparison with scan line animation
- [x] Wow Moment: character-by-character hash diff (green = match, red = different)
- [x] Wow Moment: cryptographic similarity counter animates to 0%
- [x] Manual verification: paste Merkle Root and get instant result

## On-Chain Data (ChainRightERC721 v3)

For each minted NFT, the contract stores:

```solidity
struct ProvenanceRecord {
    bytes32 merkleRoot;            // Unique hash of the image in 0G Storage
    bytes32 merkleRootOriginal;    // Parent work's Merkle Root (0 if original)
    string zkResKey;               // Unique ID of the inference in 0G Compute
    string prompt;                 // Prompt or edit instruction
    string model;                  // "flux-turbo" / "qwen-image-edit-2511" / "none"
    string sequenceNumber;         // txSeq from 0G Storage
    uint256 parentTokenId;         // Links to original NFT (0 if original)
    uint256 timestamp;             // Block timestamp
    address creator;               // Original creator's wallet
    bool exists;                   // Existence flag
}

// Mapping: merkleRoot => ProvenanceRecord
mapping(bytes32 => ProvenanceRecord) public records;

// Mapping: tokenId => merkleRoot (for ERC-721 lookup)
mapping(uint256 => bytes32) public tokenToRoot;

// Reverse lookup: creator => [merkleRoots]
mapping(address => bytes32[]) public creatorToRoots;
```

> **v3 adds**: `merkleRootOriginal` and `parentTokenId` for AI edit parent-child provenance chains.
> The verification page shows a parent chain accordion when `parentTokenId > 0`.

## Why This Works

| Attack vector | What happens |
|---|---|
| Someone steals your image, uploads it as their own | Their Merkle Root is the SAME, but the `creator` on-chain is YOUR wallet. The timestamp is EARLIER. |
| Someone generates an image with the SAME prompt | Flux Turbo (and any modern model) has randomness. Each generation is different. Merkle Root is different. |
| Someone modifies ONE PIXEL of your image | Merkle Root changes COMPLETELY. Does not match any record. |
| Someone tries to forge the date | The timestamp is the BLOCK timestamp on 0G Chain. Immutable. Irrefutable. |

## Demo Happy Path Only

Do not implement:
- Verification by ZG-Res-Key (only by Merkle Root for demo)
- Record pagination
- Filters by date/creator
