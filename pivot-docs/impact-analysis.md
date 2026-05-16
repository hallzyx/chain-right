# Impact Analysis — Pivot to Mode 1 + Mode 2

> How the two new flows change every screen, component, type, and contract in the current app.

---

## 1. `/create` Page — Current vs. Future

### Current State

```
[Prompt Input] → [Generate] → [Image Preview] → [Store] → [Mint] → [Certificate]
```

Single linear flow. User types a prompt, generates, stores, mints. One artifact.

### Future State

```
┌─────────────────────────────────────────────────────────┐
│                    CREATE ARTWORK                        │
│                                                         │
│  Choose your path:                                      │
│                                                         │
│  ┌─────────────────────┐  ┌───────────────────────────┐ │
│  │  Register Original   │  │  Register + AI Enhance    │ │
│  │  (No AI)            │  │  (qwen-image-edit-2511)   │ │
│  │                     │  │                           │ │
│  │  Upload your image  │  │  Upload → Edit with AI    │ │
│  │  ↓                  │  │  → Get enhanced version   │ │
│  │  Store + Certify    │  │                           │ │
│  └─────────┬───────────┘  └───────────┬───────────────┘ │
│            │                          │                  │
└────────────┼──────────────────────────┼──────────────────┘
             │                          │
             ▼                          ▼
    [Certificate #1]            [Certificate #1]
    mode: "original"                    │
                                 [AI Edit]
                                      │
                                      ▼
                               [Certificate #2]
                               mode: "ai-assist"
                               parentTokenId → #1
```

**Impact on existing code:**

| Current step | What changes |
|---|---|
| Prompt textarea | **Split**: Only shown for Mode 2. Hidden for Mode 1. |
| "Generate Image" button | **Repurposed**: Becomes "Register without AI" for Mode 1, "Edit with AI" for Mode 2. |
| Image preview card | **Extended**: For Mode 2, shows BEFORE/AFTER side by side (original left, edited right). |
| Step indicator | **Redesigned**: Shows 2-phase progress when Mode 2 is selected. |
| Loading states | **New**: "Editing with AI..." spinner for Mode 2's compute step. |

---

## 2. `/my-works` Gallery — Current vs. Future

### Current State

```
┌─────────────────────────────────────┐
│  My Works                           │
│  0x6F21...ec74                      │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ Work │ │ Work │ │ Work │  ...   │
│  │  #1  │ │  #2  │ │  #3  │        │
│  └──────┘ └──────┘ └──────┘        │
└─────────────────────────────────────┘
```

Single flat grid. All works treated equally.

### Future State

```
┌──────────────────────────────────────────────┐
│  My Works                                    │
│  0x6F21...ec74                               │
│                                              │
│  ─── Original Works ───────────────────      │
│  ┌──────────┐ ┌──────────┐                   │
│  │ Work #1  │ │ Work #2  │                   │
│  │ ORIGINAL │ │ ORIGINAL │                   │
│  │ Token #5 │ │ Token #8 │                   │
│  └──────────┘ └──────────┘                   │
│                                              │
│  ─── AI-Assisted Works ────────────────      │
│  ┌──────────┐ ┌──────────┐                   │
│  │ Work #3  │ │ Work #4  │                   │
│  │ AI-EDIT  │ │ AI-EDIT  │                   │
│  │ Token #9 │ │ Token #12│                   │
│  │ ↳ based  │ │ ↳ based  │                   │
│  │  on #5   │ │  on #8   │                   │
│  └──────────┘ └──────────┘                   │
└──────────────────────────────────────────────┘
```

**Impact on existing code:**

| Component | Change |
|---|---|
| `components/my-works.tsx` | **Major rewrite**: Split into two sections. Filter by `model === "none"` vs `model !== "none"`. |
| Grid layout | **Two grids**: "Original Works" + "AI-Assisted Works" with section headers. |
| Card design | **New fields**: Mode badge ("ORIGINAL" in amber, "AI-EDIT" in blue). Parent link ("↳ based on #5") for AI works. |
| Click to detail | **Extended**: AI works show BOTH certificates (original + edited). |
| `db.json` schema | **New fields**: `mode`, `parentTokenId`, `editPrompt`, `merkleRootOriginal` added to `DbWork`. |

---

## 3. `/verify` Page — Current vs. Future

### Current State

```
✅ Authenticity Confirmed
Creator: 0x6F21...ec74
Model: Flux Turbo
Prompt: "cyberpunk..."
```

### Future State

When verifying an AI-edited image that has a `parentTokenId`:

```
✅ AUTHENTICITY CONFIRMED
Mode: AI-Assisted

This artwork was created by enhancing an original.

┌─────────────────────────────────────────────┐
│  📋 AI-Edited Version (this image)          │
│  ─────────────────────────────────          │
│  👤 Creator:     0x6F21...ec74              │
│  🤖 AI Model:    qwen-image-edit-2511       │
│  📝 Edit Prompt: "cyberpunk style..."       │
│  🔑 ZK Res Key:  0x7f3d...a9c2              │
│  #️⃣ TxSeq:        82283                      │
│  🕐 Timestamp:    May 3, 2026               │
│  Token ID:       #9                          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  🎨 Based on Original Work                  │
│  ─────────────────────────────────          │
│  Token ID:       #5                          │
│  Mode:           Original (no AI)            │
│  Merkle Root:    0xae5a...e4c2               │
│  🕐 Registered:   May 3, 2026                │
│  🔗 View NFT on ChainScan →                  │
└─────────────────────────────────────────────┘
```

**Impact on existing code:**

| Component | Change |
|---|---|
| `app/verify/page.tsx` | **New accordion**: "Based on Original Work" section. Calls `getProvenanceByToken(parentTokenId)` to fetch the parent record. |
| `VerificationResult` type | **New field**: `parentProvenance?: Provenance` for linked records. |
| `AnalysisSteps` | Add step: "Fetching creative chain" when parentTokenId detected. |
| PDF certificate | Include parent chain in PDF. |

---

## 4. Certificate Card — Current vs. Future

### Current State

Single certificate. One image, one set of metadata.

### Future State

The `CertificateCard` now has two display modes:

**Mode 1 — Original (no AI):**
Shows current certificate layout but with `model: "none"` displayed and fewer fields (no prompt, no ZK-Res-Key).

**Mode 2 — AI-Assisted:**
Shows a **dual-record certificate**:

```
┌─────────────────────────────────────┐
│  CERTIFICATE OF AUTHORSHIP           │
│                                     │
│  ┌──────────────────────────────┐   │
│  │  AI-Assisted Version          │   │
│  │  [edited image thumbnail]     │   │
│  │  Token #9 · qwen-image-edit   │   │
│  │  Edit: "cyberpunk style..."   │   │
│  └──────────────────────────────┘   │
│              ↕ linked                │
│  ┌──────────────────────────────┐   │
│  │  Original Work                │   │
│  │  [original thumbnail]         │   │
│  │  Token #5 · No AI             │   │
│  │  Registered: May 3, 2026      │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Impact on existing code:**

| Component | Change |
|---|---|
| `components/certificate-card.tsx` | **Major refactor**: Accept `parentProvenance` prop. Render dual-record layout when present. |
| `lib/certificate-pdf.ts` | Include parent chain in PDF layout + metadata. |

---

## 5. Types — What Changes

### `lib/types.ts`

```typescript
// Provenance — no changes needed for Mode 1 (empty fields already supported)

// NEW: Work mode discriminator
export type WorkMode = "original" | "ai-assist";

// MODIFIED: DbWork (for db.json)
export interface DbWork {
  // ... existing fields ...
  mode: WorkMode;                    // NEW — "original" or "ai-assist"
  parentTokenId?: string;            // NEW — link to parent NFT
  editPrompt?: string;              // NEW — AI edit instruction
  merkleRootOriginal?: string;      // NEW — hash of the original image
}

// MODIFIED: VerificationResult
export interface VerificationResult {
  verified: boolean;
  merkleRoot: string;
  provenance?: Provenance;
  parentProvenance?: Provenance;    // NEW — parent record if exists
  message: string;
}

// NEW: Compute service type
export type ComputeServiceType = "text-to-image" | "image-edit" | "chatbot";
```

---

## 6. Contract — v3 Changes

### `contracts/ChainRightERC721.sol`

```solidity
struct ProvenanceRecord {
    bytes32 merkleRoot;              // unchanged
    bytes32 merkleRootOriginal;      // NEW — 0x0 for originals
    string zkResKey;                 // unchanged (empty for originals)
    string prompt;                   // edit prompt (empty for originals)
    string model;                    // "none" for originals
    string sequenceNumber;           // unchanged
    uint256 parentTokenId;           // NEW — 0 for originals
    uint256 timestamp;               // unchanged
    address creator;                 // unchanged
    bool exists;                     // unchanged
}
```

**Migration needed:**
- Deploy new v3 contract
- Update ABI in `lib/abi/ChainRightERC721.abi.ts`
- Update `lib/contract.ts` → `mintWithProvenance` now takes 8 params
- Old tokens on v2 remain — v3 is a new contract address

---

## 7. Route Changes Summary

| Route | Impact Level | What changes |
|---|---|---|
| `/` (landing) | 🟢 Low | Update copy to mention "Register" and "AI Enhance" |
| `/create` | 🔴 High | Redesign: two modes, two-phase flow for Mode 2 |
| `/my-works` | 🔴 High | Two sections, parent/child linking, mode badges |
| `/verify` | 🟡 Medium | Show parent chain when parentTokenId exists |
| API routes | 🟢 Low | `POST /api/works` needs `mode`, `parentTokenId` fields |

---

## 8. Implementation Order (recommended)

```
Phase 1: Foundation (contract + types)
  1. Deploy v3 contract
  2. Update types.ts
  3. Update contract.ts wrapper
  4. Update ABI file

Phase 2: Register Only (Mode 1)
  5. Modify /create for mode selector
  6. Implement "Register without AI" flow
  7. Update certificate-card for Mode 1 display
  8. Update /my-works to show mode badges

Phase 3: AI Edit (Mode 2)
  9. Add image-edit to lib/compute.ts
  10. Implement AI edit flow in /create
  11. Update certificate-card for dual-record
  12. Update /verify for parent chain display
  13. Update /my-works for parent/child links

Phase 4: Polish
  14. PDF certificate with parent chain
  15. Agent upgrade (0G Compute NLP)
  16. Update all docs
```
