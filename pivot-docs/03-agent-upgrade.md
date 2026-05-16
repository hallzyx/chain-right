# Pivot 03 — Agent Upgrade: 0G Compute LLM over DeepSeek

> **What:** Replace the current DeepSeek API (external) with `qwen/qwen-2.5-7b-instruct` running on **0G Compute** for the Telegram agent's NLP and Function Calling.
>
> **Why:** Currently the agent uses DeepSeek (off-chain, not verifiable). Switching to 0G Compute means:
> - Everything runs on **0G infrastructure** — no external APIs
> - TEE-verified inference execution
> - ZG-Res-Key proof for every agent decision
> - Dramatically lower cost: ~0.000372 0G (~$0.0002 USD) per verification

---

## Current Architecture (DeepSeek)

```
User message → fetch("api.deepseek.com/v1/chat/completions") → tool_calls
```

## Target Architecture (0G Compute)

```
User message → 0G Compute Broker → provider discovery (chatbot)
             → Inference(query="classify intent: ...", model="qwen-2.5-7b-instruct")
             → processResponse() → ZG-Res-Key
             → tool_calls
```

---

## Key Differences

| Aspect | DeepSeek (current) | 0G Compute (target) |
|---|---|---|
| **API endpoint** | `api.deepseek.com` | 0G Compute Network (decentralized) |
| **Model** | `deepseek-chat` | `qwen/qwen-2.5-7b-instruct` |
| **Cost** | ~$0.0005/query | ~0.000372 0G (~$0.0002 USD) |
| **TEE-verified** | ❌ No | ✅ Yes |
| **ZG-Res-Key proof** | ❌ No | ✅ Yes |
| **Provider discovery** | ❌ Fixed | ✅ Dynamic |
| **Fee settlement** | ❌ N/A | ✅ `processResponse()` required |

---

## Implementation Plan

### 1. Create `agent/utils/compute-nlp.ts`

Adapt the existing `lib/compute.ts` (text-to-image) for **chatbot** service type:

```typescript
// Provider discovery for chatbot
const providers = await broker.queryAgent({
  model: "qwen/qwen-2.5-7b-instruct",
  serviceType: "chatbot",
});

// Acknowledge provider
await broker.inference.acknowledgeProviderSigner(providerAddress);

// Inference
const response = await broker.inference.process({
  providerAddress,
  model: "qwen/qwen-2.5-7b-instruct",
  messages: [{ role: "user", content: userMessage }],
  tools: AGENT_TOOLS,
  tool_choice: "auto",
});

// Extract ZG-Res-Key
const chatID = response.headers.get("ZG-Res-Key");

// Fee settlement (CRITICAL — must be called after EVERY inference)
await broker.inference.processResponse(providerAddress, chatID, usageData);
```

### 2. Update `agent/utils/tools.ts`

No changes needed — tool definitions are identical regardless of LLM backend.

### 3. Update `agent/bot.ts`

Swap the import:

```typescript
// BEFORE
import { agentThink, agentRespond } from "./utils/nlp";

// AFTER
import { agentThink, agentRespond } from "./utils/compute-nlp";
```

### 4. Update `agent/utils/format.ts`

Adjust prompts for qwen-2.5-7b's system prompt format (it uses a different instruction-following style than DeepSeek).

### 5. Remove DeepSeek Dependency

```bash
# Remove from .env
# DEEPSEEK_API_KEY no longer needed
```

---

## Cost Analysis

| Operation | Tokens | Cost (0G) | Cost (USD) |
|---|---|---|---|
| Intent classification (1 query) | ~200 | ~0.000062 | ~$0.00003 |
| Full verification (think + respond) | ~1,200 | ~0.000372 | ~$0.0002 |
| 1,000 verifications | ~1.2M | ~0.372 | ~$0.20 |

At current 0G testnet faucet rates, you can run **~2,500 verifications** with a single faucet claim.

---

## Files to Modify

| File | Change |
|---|---|
| `agent/utils/compute-nlp.ts` | **NEW** — NLP via 0G Compute chatbot (qwen-2.5-7b) |
| `agent/utils/nlp.ts` | Keep as fallback (if 0G Compute has no providers) |
| `agent/bot.ts` | Import from `compute-nlp.ts` instead of `nlp.ts` |
| `lib/compute.ts` | Add `chatbot` service type support (currently only `text-to-image`) |
| `lib/types.ts` | Add `chatbot` to `ComputeProvider.serviceType` |
| `.env` | Remove `DEEPSEEK_API_KEY` |
| `agent/utils/format.ts` | Tweak prompts for qwen-2.5-7b |
| `userflow_agent_verify.md` | Update NLP section to reference 0G Compute |
| `stack.md` | Remove DeepSeek, add 0G Compute NLP |
| `spec.md` | Update agent NLP architecture |
| `AGENTS.md` | Update agent skills table |

---

## 0G Components Used

| Layer | Usage |
|---|---|
| **0G Compute** | `qwen/qwen-2.5-7b-instruct` — TEE-verified chatbot inference for agent NLP + Function Calling |
| **0G Storage** | KV/Log memory (unchanged from current agent) |
| **0G Chain** | Provenance queries (unchanged from current agent) |

---

## Why This Upgrade Wins

1. **100% on 0G** — No external APIs, no API keys, no rate limits, no data leaving the 0G ecosystem
2. **TEE-verifiable** — Every agent decision is cryptographically provable via ZG-Res-Key
3. **Cheaper** — 0G Compute is ~2.5x cheaper than DeepSeek for comparable inference quality
4. **More decentralized** — Dynamic provider discovery means no single point of failure
5. **Track 2 alignment** — The judges will see every 0G layer used: Compute (NLP) + Storage (memory) + Chain (provenance)
