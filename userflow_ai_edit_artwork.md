# Userflow — AI Edit Artwork

> Uses 0G Compute `qwen/qwen-image-edit-2511` to edit a registered image with AI. Creates a **parent-child** provenance chain.

## Actors

- Creator user
- 0G Compute Network (qwen-image-edit-2511)
- 0G Storage Network
- 0G Chain (ChainRightERC721 v3 contract)

## Preconditions

- User has already minted an original NFT (ProvenanceRecord #1)
- User has the image data accessible (base64 or StorageScan URL)
- User has compute funds deposited (auto-managed via ledger)

## Flow

### Step 1: Start the Edit

**From Gallery** (`/my-works`):
1. User clicks **"Edit with AI"** on a work
2. Redirects to `/create?editWorkId=...`
3. System loads the work data: image, Merkle Root, original tokenId, provenance

**From Certificate** (`/create` after mint):
1. After minting original, "Edit with AI" section appears
2. System uses the just-minted work data (already in state)

### Step 2: Write Edit Prompt

1. User writes prompt: "add christmas theme to the logo"
2. Clicks **"Edit with AI"**
3. If image is a StorageScan URL (from gallery), downloads it and converts to base64

### Step 3: Image Editing via 0G Compute

1. System discovers `image-editing` providers (`serviceType === "image-editing"`)
   - Current provider: `0x4b2a941929E39Adbea5316dDF2B9Bd8Ff3134389` (TEE-verified)
2. System gets service metadata → endpoint + model
3. Prepares **multipart/form-data** request (NOT JSON):
   - `model`: `qwen/qwen-image-edit-2511`
   - `image`: PNG file as Blob
   - `prompt`: edit instruction
   - `response_format`: `b64_json` (to avoid internal URLs)
4. Auth headers signed with empty string (multipart boundary is dynamic)
5. Sends `POST ${endpoint}/images/edits`
6. Extracts `ZG-Res-Key` from header
7. Calls `processResponse(providerAddress, chatID)`
8. Parses response: `data[0].b64_json` → image bytes

### Step 4: Show Edited Result

1. Displays edited image with provenance data:
   - AI Model: `qwen/qwen-image-edit-2511`
   - ZG-Res-Key: `ce2ba1...`
   - Provider: `0x4b2a...`
   - Based on: Original (Merkle Root: `0xdb285afc...`)

### Step 5: Store and Mint Edited Version

1. User clicks **"Store & Mint Edited Version"**
2. Uploads edited image to 0G Storage → gets new Merkle Root + txSeq
3. Mints **ProvenanceRecord #2** with:
   - `merkleRoot` → hash of edited image
   - `merkleRootOriginal` → parent work's Merkle Root
   - `zkResKey` → from image editing inference
   - `prompt` → edit instruction
   - `model` → `qwen/qwen-image-edit-2511`
   - `parentTokenId` → original NFT's token ID

### Step 6: Certificate

1. Shows dual certificate:
   - New edited record (ProvenanceRecord #2)
   - Original record (ProvenanceRecord #1)
   - Token IDs for both
   - "Based on original work #[tokenId]"

---

## Auto-Funding

If provider returns "insufficient balance" during editing:
1. Transfers 0.1 0G from compute ledger to provider sub-account
2. Retries the editing request with fresh auth headers
3. If the user's ledger has insufficient funds, returns error

---

## /verify Page — Parent Chain

When parentTokenId > 0:
- Shows accordion with parent work provenance
- User can expand to see the full creative chain

---

## Key Technical Details

| Aspect | Detail |
|---|---|
| **Endpoint** | `/images/edits` via multipart/form-data |
| **Auth signing** | Empty string (boundary is dynamic) |
| **Image format** | `response_format: "b64_json"` |
| **Provider URL return** | `http://0.0.0.0:9999/...` (not accessible) → use b64_json instead |
| **Work data persistence** | `db.json` via `POST /api/works` |

---

## Acceptance Criteria

- [x] User can edit an existing registered work from gallery
- [x] User can edit a just-minted work from certificate view
- [x] Image editing uses multipart/form-data (not JSON)
- [x] `processResponse()` called after editing inference
- [x] Edited image displays correctly (no broken internal URLs)
- [x] New NFT minted with parentTokenId linking to original
- [x] Dual certificate shows both records
- [x] Auto-transfer handles insufficient balance
