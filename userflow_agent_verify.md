# Userflow — Agent Verification (Telegram Bot)

## Actors

- Verifier user (any Telegram user)
- 0G Compute Network (qwen/qwen-2.5-7b-instruct for NLP + Function Calling)
- 0G Storage Network (Merkle + KV/Log agent memory)
- 0G Chain (ChainRightERC721 v3 contract)

## Preconditions

- Telegram bot created via @BotFather
- `TELEGRAM_BOT_TOKEN` set in `.env`
- 0G Compute chatbot provider funded (min. 1.0 0G reserve in sub-account)
  - Provider: `0xa48f01287233509FD694a22Bf840225062E67836`
- ChainRightERC721 v3 deployed on 0G Testnet

## Flow

### Step 1: User sends image + natural language

User sends a photo or document to the bot with a message.

**System response — Agent Thinking:**
1. Bot receives message with photo/document + caption
2. Calls `agentThink()` → sends messages + tool definitions to 0G Compute
3. `chatCompletion()` handles:
   - Provider discovery (`chatbot` service type)
   - Auth header generation (signed with JSON body)
   - Auto-deposit: if provider says "insufficient balance", deposits 0.1 0G from on-chain wallet to ledger and retries
   - `processResponse()` for fee settlement
4. 0G Compute (qwen-2.5-7b-instruct) decides which tool to call:
   - "verify" + image attached → `verify_image`
   - "what can you do" → `show_help`
   - "stats" → `show_stats`
   - "hello" → `chat_reply`

### Step 2: Tool Execution — verify_image

1. Downloads image from Telegram
2. Computes Merkle Root via `computeMerkleRootFromBuffer()`
3. Queries 0G Chain contract via `verifyProvenance()`
4. Gets tokenId and txHash from contract events
5. Builds chainScanUrl, nftUrl, storageScanUrl
6. Generates PDF certificate via `generatePdfBuffer()`
7. Records verification in memory (KV + Log)

### Step 3: 0G Compute generates final response

The verification data is sent back via `agentRespond()` to 0G Compute, which formats a natural response:

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

☁️ View on StorageScan
https://storagescan-galileo.0g.ai/submission/68406
```

### Step 4: PDF Delivery

If verification successful: sends Certificate PDF as Telegram document attachment.

### Step 5: Memory Sync (0G Storage)

- Local state saved to `agent-state.json`, `agent-log.json`
- Every 5 verifications: synced to 0G Storage via `syncTo0G()`
- On Ctrl+C: final sync before exit
- On restart: download from 0G Storage and restore state

---

## NLP Architecture (0G Compute)

```
agent/utils/nlp.ts → chatCompletion() in lib/compute.ts
                   → 0G Compute Broker
                   → discoverProviders("chatbot")
                   → getServiceMetadata(providerAddress)
                   → getRequestHeaders(providerAddress, JSON.stringify(body))
                   → POST ${endpoint}/chat/completions
                   → processResponse(providerAddress, chatID, usageData)
```

- **Model**: `qwen/qwen-2.5-7b-instruct`
- **Provider**: `0xa48f01287233509FD694a22Bf840225062E67836` (TEE-verified)
- **Endpoint**: `https://compute-network-6.integratenetwork.work/v1/proxy/chat/completions`
- **Tool calling**: OpenAI-compatible format with `tools` array and `tool_choice: "auto"`
- **Cost**: ~0.0000001 0G per query

---

## Fallback (When 0G Compute Unavailable)

If `chatCompletion()` fails:
- Uses keyword matching in `fallbackAgent()` — **no DeepSeek, no external APIs**
- Keywords: "verify", "check", "validate" → verify_image; "help" → show_help; "stats" → show_stats; default → chat_reply
- `chat_reply` in fallback returns a raw instruction string (not natural language)

---

## Auto-Funding

```
Request → Provider: "insufficient balance"
    ↓
Deposit 0.1 0G from on-chain wallet → compute ledger
    ↓
Retry request (fresh auth headers)
    ↓
Success → processResponse()
```

If on-chain wallet has no ETH for gas: falls back to keyword matching.

---

## Logging

Agent logs show per-interaction:
```
✅ 0G Compute decided tool: verify_image
   🆔 ChatID: d87c606f...        ← ZG-Res-Key from header
   🏛️ Provider: 0xa48f0128...     ← provider address
   🤖 Model: qwen/qwen-2.5-7b... ← model used
```

---

## Acceptance Criteria

- [x] Agent uses 0G Compute for ALL NLP (no DeepSeek)
- [x] `processResponse()` called after every inference
- [x] ZG-Res-Key captured per interaction
- [x] Auto-deposit works on insufficient balance
- [x] Keyword fallback works when 0G Compute unavailable
- [x] PDF certificate generated and sent
- [x] Agent memory synced to 0G Storage
