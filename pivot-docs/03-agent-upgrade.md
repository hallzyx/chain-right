# Pivot 03 — Agent Upgrade: 0G Compute LLM over DeepSeek

> **What:** Replaced DeepSeek API with `qwen/qwen-2.5-7b-instruct` on **0G Compute** for the Telegram agent's NLP and Function Calling.
>
> **Why:** Everything now runs on **0G infrastructure** — no external APIs. TEE-verified inference with ZG-Res-Key proof for every agent decision. Dramatically lower cost.

---

## Architecture

```
User message → agentThink() → 0G Compute (qwen-2.5-7b-instruct)
    → decides tool (verify_image / show_help / show_stats / chat_reply)
    → executeTool() → tool result
    → agentRespond() → 0G Compute generates final response
```

---

## Implementation (In-Place)

Unlike the original plan (new `compute-nlp.ts` file), the implementation modified `nlp.ts` **in-place**:
- `agentThink()` — sends messages + tool definitions to 0G Compute
- `agentRespond()` — sends tool result back for final response generation
- `fallbackAgent()` — keyword-based fallback (no DeepSeek, no APIs)

The `chatCompletion()` function lives in `lib/compute.ts` and handles:
- Provider discovery (`chatbot` service type)
- Auth header generation (signed with JSON body string)
- **Auto-deposit**: If provider returns "insufficient balance", deposits 0.1 0G from on-chain wallet to compute ledger and retries
- `processResponse()` call for fee settlement
- Tool calling in OpenAI-compatible format

---

## Key Differences

| Aspect | DeepSeek (before) | 0G Compute (after) |
|---|---|---|
| **API** | `api.deepseek.com` | 0G Compute Network (decentralized) |
| **Model** | `deepseek-chat` | `qwen/qwen-2.5-7b-instruct` |
| **TEE-verified** | ❌ No | ✅ Yes |
| **ZG-Res-Key proof** | ❌ No | ✅ Yes |
| **Provider** | Fixed | Dynamic via `discoverProviders("chatbot")` |
| **Fee settlement** | N/A | `processResponse()` required |
| **Cost** | ~$0.0005/query | ~0.0000001 0G/query |

---

## Auto-Funding Flow

```
Request → Provider says "insufficient balance"
    ↓
Deposit 0.1 0G from on-chain wallet → compute ledger
    ↓
Retry request (fresh auth headers)
    ↓
Success → processResponse() → done
```

If deposit fails (wallet has no ETH for gas), falls back to keyword-based routing.

---

## What Was Implemented

| File | Changes |
|---|---|
| `agent/utils/nlp.ts` | Replaced DeepSeek API with `chatCompletion()` from `lib/compute.ts` |
| `agent/bot.ts` | Updated comments, removed DeepSeek references |
| `lib/compute.ts` | Added `chatCompletion()` with tool calling, auto-deposit, processResponse |
| `lib/types.ts` | Added `ChatMessage`, `ChatCompletionResult`, `ToolDefinition` types |

---

## Persistent Memory (0G Storage)

On Ctrl+C, the agent syncs state to 0G Storage:
- `agent-state.json` — user stats, counters
- `agent-log.json` — verification history

On restart, it downloads and restores both files.

---

## 0G Components Used

| Layer | Usage |
|---|---|
| **0G Compute** | `qwen/qwen-2.5-7b-instruct` — TEE-verified chatbot for agent NLP + Function Calling |
| **0G Storage** | KV/Log memory (agent state + log persistence) |
| **0G Chain** | Provenance queries (unchanged from original agent) |
