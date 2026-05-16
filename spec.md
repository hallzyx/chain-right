# Spec — ChainRight

> Technical architecture and decisions. ARZ Lite format.

---

## Architecture Overview

```
┌──────────────────────┐     ┌──────────────────────────┐
│   Next.js 15 Web App  │     │  Telegram Agent (grammY) │
│   (Vercel)            │     │  (tsx, standalone)       │
└────────┬─────────────┘     └──────────┬───────────────┘
         │                              │
         │  Server Actions              │  lib/compute.ts
         │  API Routes                  │  lib/contract.ts
         │                              │
         └──────────────┬───────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
    ┌─────────┐  ┌──────────┐  ┌──────────┐
    │0G Compute│  │0G Storage│  │ 0G Chain │
    │ Flux     │  │ Merkle   │  │ ERC-721  │
    │ Turbo    │  │ KV/Log   │  │ NFT  v3  │
    │ Qwen Img │  └──────────┘  └──────────┘
    │ Qwen NLP │
    └─────────┘
```

---

## Web App Architecture

### Routes

| Route | Type | Auth | Description |
|---|---|---|---|
| `/` | Static | Public | Landing page (Black & Amber) |
| `/create` | Client | Wallet | Generate → Store → Mint + Register Original + AI Edit |
| `/verify` | Client | Wallet | Upload → Verify → Wow Moment |
| `/my-works` | Client | Wallet | Personal gallery (with "Edit with AI" button) |
| `/api/storage/upload` | API | Server | Multipart upload to 0G Storage |
| `/api/storage/download` | API | Server | Download from 0G Storage by Merkle Root |
| `/api/compute/status` | API | Server | Compute ledger status + deposit |
| `/api/works` | API | Server | CRUD for db.json |
| `/api/users/login` | API | Server | User login |

### Data Flow: Create (Generate)

```
User prompt → Server Action → 0G Compute (provider discovery + Flux Turbo inference)
    → processResponse() for fee settlement
    → Show image + provenance (ZG-Res-Key, model, prompt)
    → User clicks "Store" → /api/storage/upload → 0G Storage
    → Merkle Root + txSeq
    → User clicks "Mint" → Server Action → ethers v6 → 0G Chain
    → Certificate of Authorship
```

### Data Flow: AI Edit

```
User clicks "Edit with AI" on existing work
    → Loads original image (base64 or StorageScan URL)
    → 0G Compute (qwen-image-edit-2511) via multipart/form-data
    → processResponse() for fee settlement
    → Shows edited image + provenance (ZG-Res-Key, model, edit prompt)
    → User clicks "Store & Mint" → 0G Storage + 0G Chain with parentTokenId
    → Dual certificate (original + edited)
```

### Data Flow: Verify

```
User uploads image → FileReader → base64
    → actionComputeMerkleRoot() → temp file → ZgFile.merkleTree()
    → actionVerifyImage() → contract.getProvenance()
    → Result: ✅ confirmed / ❌ not found
    → Wow Moment: modifyOnePixel() → recompute hash → diff display
```

### Design System

Black & Amber Edition — extracted from Stitch AI design tool.

- Background: `#0A0A0A` (Ink Black)
- Surfaces: `#141414`, `#1E1E1E`, `#31281f`
- Accent: `#F59E0B` (Amber) — used surgically for CTAs and active states
- Text: `#F0E0D1` (Warm Ivory), `#D8C3AD` (Warm Grey), `#888888` (Secondary)
- Typography: Newsreader (serif headlines) + Inter (sans body)
- Shapes: 0px border-radius everywhere — sharp, architectural
- Depth: Tonal layers only, no shadows, no borders (except `white/5`)

---

## Agent Architecture

### Entrypoint: `agent/bot.ts`

```
bot.on(":photo" | ":document") → agentThink() [0G Compute qwen-2.5-7b]
    → tool_calls? → executeTool() → agentRespond() [0G Compute qwen-2.5-7b]
    → ctx.reply(finalResponse)
    → bot.api.sendDocument(PDF)
```

### NLP: `agent/utils/nlp.ts`

- Uses **0G Compute** `qwen/qwen-2.5-7b-instruct` with OpenAI-compatible tool calling
- 4 tools defined: `verify_image`, `show_help`, `show_stats`, `chat_reply`
- System prompt instructs the model on when to call each tool
- `chatCompletion()` in `lib/compute.ts` handles:
  - Provider discovery (`discoverProviders("chatbot")`)
  - Auth header generation (signed with JSON body)
  - Auto-deposit: if provider returns insufficient balance, deposit 0.1 0G from on-chain wallet and retry
  - `processResponse()` for fee settlement
- Fallback to keyword matching if 0G Compute unavailable

### Memory: `agent/memory/0g-kv.ts`

```
agent-state.json → uploadBuffer() → 0G Storage → Merkle Root in .0g-kv-root
agent-log.json   → uploadBuffer() → 0G Storage

On startup:  downloadFile(merkleRoot) → restore state
On verify:   local save + throttle sync (every 5 ops)
On shutdown: SIGINT → final syncTo0G()
```

### Verification: `agent/handlers/verify.ts`

```
Photo/Document → downloadTelegramImage() → Buffer
    → computeMerkleRootFromBuffer() → Merkle Root
    → verifyProvenance() → contract.getProvenance() [v3]
    → getTokenIdAndTxByMerkleRoot() → event query
    → generatePdfBuffer() → PDF
    → Returns VerifyImageData (no Telegram messages)
```

### Tool Result Format

For `verify_image`, the tool result includes:
- Creator, AI Model, Prompt, ZK Res Key, Sequence, Timestamp
- Merkle Root
- URLs: Mint Tx on ChainScan, NFT on ChainScan, StorageScan
- PDF buffer sent as separate Telegram document

---

## 0G Compute Operations

| Operation | Service Type | Endpoint | Format | Auth Body |
|---|---|---|---|---|
| Text-to-Image | `text-to-image` | `/images/generations` | JSON | `JSON.stringify(body)` |
| Image Editing | `image-editing` | `/images/edits` | multipart/form-data | `""` (empty) |
| Chatbot NLP | `chatbot` | `/chat/completions` | JSON | `JSON.stringify(body)` |

All three include:
- Provider discovery (`discoverProviders(serviceType)`)
- Auto-funding on insufficient balance
- `processResponse()` call
- ZG-Res-Key extraction

---

## Contract Architecture

### ChainRightERC721 v3 (active: `0xfca49910C81355eE3787e4E87F16a18E593bedB0`)

```solidity
struct ProvenanceRecord {
    bytes32 merkleRoot;
    bytes32 merkleRootOriginal;   // parent work's Merkle Root (0 if no parent)
    string zkResKey;
    string prompt;
    string model;
    string sequenceNumber;
    uint256 parentTokenId;         // links to original NFT (0 if no parent)
    uint256 timestamp;
    address creator;
    bool exists;
}

mapping(bytes32 => ProvenanceRecord) public records;
mapping(uint256 => bytes32) public tokenToRoot;

function mintProvenanceWithChain(
    bytes32 merkleRoot_,
    string memory zkResKey_,
    string memory prompt_,
    string memory model_,
    string memory sequenceNumber_,
    uint256 parentTokenId_
) external returns (uint256);

event ProvenanceMinted(uint256 indexed tokenId, bytes32 indexed merkleRoot, ...);
```

### v3 vs v2

| Field | v2 | v3 |
|---|---|---|
| `merkleRoot`, `zkResKey`, `prompt`, `model`, `sequenceNumber` | ✅ | ✅ |
| `merkleRootOriginal` | ❌ | ✅ — links to pre-edit image |
| `parentTokenId` | ❌ | ✅ — links edited NFT to original |
| Mint function | `mintWithProvenance(5 args)` | `mintProvenanceWithChain(6 args)` |

### Agent Event Query

`getTokenIdAndTxByMerkleRoot()` filters `ProvenanceMinted` events by Merkle Root to retrieve tokenId and transactionHash for ChainScan links.

---

## Key Technical Decisions

| Decision | Rationale |
|---|---|
| **0G Compute over DeepSeek** | Everything on 0G for hackathon. qwen-2.5-7b handles tool calling in OpenAI format. No external APIs. |
| **Multipart for image editing** | The `/images/edits` endpoint requires multipart/form-data, not JSON. Auth headers signed with empty string (boundary is dynamic). |
| **`response_format: b64_json`** | Provider returns internal URLs (`http://0.0.0.0:9999/...`) if not requested. b64_json avoids broken images. |
| **Local JSON + periodic 0G sync** | Real-time KV streams require Batcher + Flow contracts. Local-first with sync is simpler and still demonstrates 0G Storage KV/Log. |
| **Separate agent process** | Agent is standalone (tsx), not embedded in Next.js. Avoids build issues with Node.js-only modules. |
| **Black & Amber from Stitch** | Design extracted via MCP from Stitch AI tool. Premium editorial aesthetic fits the provenance/certificate brand. |
| **grammY over telegraf** | Modern framework, full TypeScript support, Function Calling friendly, active maintenance. |
| **RainbowKit amber theme** | Custom darkTheme with accentColor: #F59E0B, borderRadius: "none" for consistency with design system. |
