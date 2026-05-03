# Userflow — Agent Verification (Telegram Bot)

## Actors

- Verifier user (any Telegram user)
- DeepSeek API (NLP + Function Calling)
- 0G Storage Network (Merkle + KV/Log)
- 0G Chain (ChainRightERC721 contract + events)

## Preconditions

- Telegram bot created via @BotFather
- `TELEGRAM_BOT_TOKEN` and `DEEPSEEK_API_KEY` set in `.env`
- ChainRightERC721 contract deployed on 0G Testnet
- User has the image to verify

## Flow

### Step 1: User sends image + natural language

User sends a photo or document to the bot with a message like:
- "verify this image"
- "is this artwork authentic?"
- "check the provenance of this"
- "hi, can you validate this?"

**System response — Agent Thinking:**
1. Bot receives message with photo/document + caption
2. Calls `agentThink()` → sends message + available tools to DeepSeek
3. DeepSeek analyzes intent and context:
   - User mentioned "verify" + has image attached → tool: `verify_image`
   - User asked "what can you do" → tool: `show_help`
   - User asked "my stats" → tool: `show_stats`
   - User said "hello" → tool: `chat_reply`

### Step 2: Tool Execution — verify_image

If DeepSeek calls `verify_image`:

1. System downloads image from Telegram (`downloadTelegramImage` or `downloadTelegramDocument`)
2. Computes Merkle Root via `computeMerkleRootFromBuffer()`
3. Queries 0G Chain contract via `verifyProvenance()`
4. Queries contract events via `getTokenIdAndTxByMerkleRoot()` for tokenId and txHash
5. Builds chainScanUrl, nftUrl, storageScanUrl
6. Generates PDF certificate via `generatePdfBuffer()`
7. Records verification in memory (KV + Log)

**System response — Tool Result:**
The verification data is formatted and sent back to DeepSeek with explicit formatting instructions.

### Step 3: DeepSeek generates final response

DeepSeek receives the tool result and generates a natural language response including ALL provenance data:

```
✅ AUTHENTICITY CONFIRMED

This artwork has an immutable record on 0G Chain.

👤 Creator:     0x6F21...ec74
🤖 AI Model:    Flux Turbo
📝 Prompt:      Portada de pelea en los cerros de los andes
🔑 ZK Res Key:  openai...back
#️⃣ Sequence:    68406
🕐 Timestamp:   May 1, 2026, 09:44 PM GMT-5

🔐 Merkle Root:
0xae5a02e6441a844c0eb0a562dc33c78f66ade201ef04279fb48bbcd116e2e4c2

⛓️ View Mint Tx on ChainScan
https://chainscan-galileo.0g.ai/tx/0x305a...

🎨 View NFT on ChainScan
https://chainscan-galileo.0g.ai/nft/0xE76B.../1

☁️ View on StorageScan
https://storagescan-galileo.0g.ai/submission/68406
```

### Step 4: PDF Delivery

If verification is successful, the agent sends the Certificate of Authenticity as a PDF document:
- Generated via `jspdf` in Node.js (no browser needed)
- Sent as Telegram document attachment
- Contains: Merkle Root, creator, model, prompt, sequence, timestamp, network info

### Step 5: Memory Sync

After each verification:
1. Local state saved to `agent-state.json` (per-user stats, global counters)
2. Verification logged to `agent-log.json` (audit trail)
3. Every 5 verifications: state synced to 0G Storage via `syncTo0G()`
4. On shutdown (SIGINT): final sync to 0G Storage

### Memory Restore on Restart

On agent startup:
1. Read `.0g-kv-root` for stored Merkle Roots
2. Attempt `downloadFile(merkleRoot)` from 0G Storage
3. If successful, restore `agent-state.json` and `agent-log.json`
4. If not found, start fresh with local files

---

## Alternative Flows

### No image attached

User says "verify" but doesn't send an image.

**System response:**
```
📸 Send me the image you want to verify and I'll check its on-chain provenance!
```

### Image sent as photo (compressed)

Telegram compresses photos. The Merkle Root will differ from the original.

**System response:**
The verification completes but includes a warning:
```
⚠️ Sent as photo — Telegram compresses images. For exact verification, send as a document file instead.
```

### Manual Merkle Root verification (future)

User pastes a Merkle Root directly. Not yet implemented in agent (available in web app).

---

## Tool Decision Matrix

| User says... | Image? | DeepSeek chooses tool... | Result |
|---|---|---|---|
| "verify this" | ✅ | `verify_image(has_image=true)` | Provenance check |
| "is this real" | ✅ | `verify_image(has_image=true)` | Provenance check |
| "check authenticity" | ❌ | `verify_image(has_image=false)` | "Send me an image" |
| "what can you do" | ❌ | `show_help(topic=general)` | Help message |
| "my stats" | ❌ | `show_stats()` | Stats display |
| "hello" | ❌ | `chat_reply()` | Greeting |
| "how are you" | ❌ | `chat_reply()` | Friendly reply |

---

## Fallback (No DeepSeek API)

If `DEEPSEEK_API_KEY` is not configured:
- Uses keyword matching fallback in `agent/utils/nlp.ts`
- Same tool execution, but deterministic instead of LLM-driven
- Keywords: "verify", "check", "validate" → verify_image; "help" → show_help; "stats" → show_stats

---

## Memory Architecture

```
agent-state.json  ←→  0G Storage (uploadBuffer)
agent-log.json    ←→  0G Storage (uploadBuffer)
.0g-kv-root       ←    Merkle Roots for retrieval

Sync strategy:
- On verify: local save immediately
- Every 5 verifications: uploadBuffer() → 0G Storage
- On SIGINT: final syncTo0G()
- On startup: downloadFile() → restore if available
```
