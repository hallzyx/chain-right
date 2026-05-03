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
         │  Server Actions              │  lib/storage.ts
         │  API Routes                  │  lib/contract.ts
         │                              │
         └──────────────┬───────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
    ┌─────────┐  ┌──────────┐  ┌──────────┐
    │0G Compute│  │0G Storage│  │ 0G Chain │
    │ Flux     │  │ Merkle   │  │ ERC-721  │
    │ Turbo    │  │ KV/Log   │  │ NFT      │
    └─────────┘  └──────────┘  └──────────┘
```

---

## Web App Architecture

### Routes

| Route | Type | Auth | Description |
|---|---|---|---|
| `/` | Static | Public | Landing page (Black & Amber) |
| `/create` | Client | Wallet | Generate → Store → Mint flow |
| `/verify` | Client | Wallet | Upload → Verify → Wow Moment |
| `/my-works` | Client | Wallet | Personal gallery |
| `/api/storage/upload` | API | Server | Multipart upload to 0G Storage |
| `/api/works` | API | Server | CRUD for db.json |
| `/api/users/login` | API | Server | User login |

### Data Flow: Create

```
User prompt → Server Action → 0G Compute (provider discovery + inference)
    → processResponse() for fee settlement
    → Show image + provenance
    → User clicks "Store" → /api/storage/upload → 0G Storage
    → Merkle Root + Sequence Number
    → User clicks "Mint" → Server Action → ethers v6 → 0G Chain
    → Certificate of Authorship
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
bot.on(":photo" | ":document") → agentThink() [DeepSeek]
    → tool_calls? → executeTool() → agentRespond() [DeepSeek]
    → ctx.reply(finalResponse)
    → bot.api.sendDocument(PDF)
```

### NLP: `agent/utils/nlp.ts`

- Uses **DeepSeek chat API** with `tool_choice: "auto"`
- 4 tools defined: `verify_image`, `show_help`, `show_stats`, `chat_reply`
- System prompt instructs DeepSeek on when to call each tool
- After tool execution, result fed back to DeepSeek for natural response
- Fallback to keyword matching if API unavailable

### Memory: `agent/memory/0g-kv.ts`

```
agent-state.json → uploadBuffer() → 0G Storage → Merkle Root stored in .0g-kv-root
agent-log.json   → uploadBuffer() → 0G Storage

On startup:  downloadFile(merkleRoot) → restore state
On verify:   local save + throttle sync (every 5 ops)
On shutdown: SIGINT → final syncTo0G()
```

### Verification: `agent/handlers/verify.ts`

```
Photo/Document → downloadTelegramImage() → Buffer
    → computeMerkleRootFromBuffer() → Merkle Root
    → verifyProvenance() → contract.getProvenance()
    → getTokenIdAndTxByMerkleRoot() → event query
    → generatePdfBuffer() → PDF
    → Returns VerifyImageData (no Telegram messages)
```

### Tool Result Format

For `verify_image`, the tool result passed to DeepSeek includes ALL provenance data with explicit formatting instructions:

- Creator, AI Model, Prompt, ZK Res Key, Sequence, Timestamp
- Merkle Root
- URLs: Mint Tx on ChainScan, NFT on ChainScan, StorageScan
- Instruction: "Do NOT use Markdown. Plain text with emojis."
- PDF buffer sent as separate Telegram document

---

## Contract Architecture

### ChainRightERC721 v2 (0xE76B9f...)

```solidity
struct ProvenanceRecord {
    bytes32 merkleRoot;
    string zkResKey;
    string prompt;
    string model;
    string sequenceNumber;  // txSeq → links to StorageScan
    uint256 timestamp;
    address creator;
    bool exists;
}

mapping(bytes32 => ProvenanceRecord) public records;
mapping(uint256 => bytes32) public tokenToRoot;

event ProvenanceMinted(uint256 indexed tokenId, bytes32 indexed merkleRoot, ...);
```

- `getProvenance(bytes32)` → lookup by Merkle Root
- `mintWithProvenance(bytes32, string, string, string, string)` → mint with 5 params
- `tokenURI(uint256)` → on-chain base64 JSON metadata

### Agent Event Query

`getTokenIdAndTxByMerkleRoot()` filters `ProvenanceMinted` events by Merkle Root to retrieve tokenId and transactionHash for building ChainScan links.

---

## File Structure

```
chainright/
├── app/                      # Next.js App Router
│   ├── create/page.tsx       # Generate → Store → Mint (Client Component)
│   ├── verify/page.tsx       # Verify + Wow Moment (Client Component)
│   ├── my-works/page.tsx     # Personal gallery
│   ├── layout.tsx            # Root layout (Newsreader + Inter)
│   ├── globals.css           # Black & Amber design tokens
│   ├── actions.ts            # Server Actions (orchestration)
│   └── api/                  # API routes
├── agent/                    # Autonomous Telegram Agent
│   ├── bot.ts                # Entrypoint (Function Calling loop)
│   ├── context.ts            # Bot context type
│   ├── handlers/             # verify.ts, start.ts, help.ts, stats.ts
│   ├── memory/               # kv.ts, log.ts, 0g-kv.ts
│   └── utils/                # nlp.ts, telegram.ts, format.ts, pdf.ts, tools.ts
├── components/               # React components
│   ├── client-root.tsx       # Shell (nav + footer + wallet gate)
│   ├── wallet-gate.tsx       # Vault Dial gate (Stitch design)
│   ├── providers.tsx         # RainbowKit + Wagmi (amber theme)
│   ├── my-works.tsx          # Gallery grid
│   ├── certificate-card.tsx  # Certificate display
│   └── wow-moment.tsx        # Pixel diff + hash comparison
├── contracts/                # Solidity
│   └── ChainRightERC721.sol
├── lib/
│   ├── storage.ts            # 0G Storage wrapper (ZgFile, Indexer)
│   ├── compute.ts            # 0G Compute wrapper (Broker)
│   ├── contract.ts           # ethers v6 wrapper + event query
│   ├── certificate-pdf.ts    # jsPDF generation
│   ├── wallet-config.ts      # RainbowKit + Wagmi config
│   └── types.ts              # Shared TypeScript interfaces
└── docs/
    ├── README.md             # Project overview
    ├── brief.md              # This file — pitch
    ├── spec.md               # Architecture decisions
    ├── product.md            # Product vision
    ├── stack.md              # Tech stack
    ├── userflow_generar_mintear.md
    ├── userflow_verificar.md
    └── userflow_agent_verify.md
```

---

## Key Technical Decisions

| Decision | Rationale |
|---|---|
| **DeepSeek over 0G Compute chatbot** | 0G chatbot providers unreliable for demo. DeepSeek is deterministic, cheap, and handles Function Calling natively. |
| **Local JSON + periodic 0G sync** | Real-time KV streams require Batcher + Flow contracts. Local-first with sync is simpler and still demonstrates 0G Storage KV/Log. |
| **Separate agent process** | Agent is standalone (tsx), not embedded in Next.js. Avoids build issues with Node.js-only modules (fs, path) in browser bundle. |
| **Black & Amber from Stitch** | Design extracted via MCP from Stitch AI tool. Premium editorial aesthetic fits the provenance/certificate brand. |
| **grammY over telegraf** | Modern framework, full TypeScript support, Function Calling friendly, active maintenance. |
| **RainbowKit amber theme** | Custom darkTheme with accentColor: #F59E0B, borderRadius: "none" for consistency with design system. |
