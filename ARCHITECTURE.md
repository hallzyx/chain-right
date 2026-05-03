# Architecture — ChainRight

> System architecture and data flow diagrams.

---

## High-Level Architecture

```
                          ┌─────────────────────────────────────────────┐
                          │                USERS                        │
                          │    Web Browser          Telegram App        │
                          └────────┬──────────────────────┬─────────────┘
                                   │                      │
              ┌────────────────────┼──────────────────────┼──────────────────────┐
              │                    │                      │                      │
              ▼                    ▼                      ▼                      ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐
    │  Next.js 15      │  │  RainbowKit      │  │  Telegram Bot Agent (grammY)   │
    │  App Router      │  │  (Amber theme)   │  │                                 │
    │  (Vercel)        │  │                  │  │  ┌─────────────────────────┐    │
    │                  │  │  Wallet Connect  │  │  │  DeepSeek NLP           │    │
    │  /               │  │  Network Switch  │  │  │  (Function Calling)     │    │
    │  /create          │  │──────────────────│  │  │                         │    │
    │  /verify          │          │          │  │  │  Tools:                 │    │
    │  /my-works        │          ▼          │  │  │  • verify_image         │    │
    │                  │  ┌─────────────────┐ │  │  │  • show_help            │    │
    │  Server Actions  │  │  MetaMask /     │  │  │  • show_stats           │    │
    │  API Routes      │  │  WalletConnect  │  │  │  • chat_reply           │    │
    └────────┬─────────┘  └─────────────────┘  │  └─────────────────────────┘    │
             │                                  │                                 │
             │                                  │  ┌─────────────────────────┐    │
             │                                  │  │  Persistent Memory      │    │
             │                                  │  │  ┌───────────────────┐  │    │
             │                                  │  │  │ agent-state.json   │  │    │
             │                                  │  │  │ agent-log.json     │  │    │
             │                                  │  │  │ .0g-kv-root        │  │    │
             │                                  │  │  └─────────┬─────────┘  │    │
             │                                  │  │            │             │    │
             │                                  │  │            ▼             │    │
             │                                  │  │  ┌───────────────────┐  │    │
             │                                  │  │  │ 0G KV/Log Sync    │  │    │
             │                                  │  │  │ (uploadBuffer /    │  │    │
             │                                  │  │  │  downloadFile)     │  │    │
             │                                  │  │  └───────────────────┘  │    │
             │                                  │  └─────────────────────────┘    │
             │                                  └──────────────┬──────────────────┘
             │                                                 │
             │                    ┌────────────────────────────┘
             │                    │
    ┌────────┴────────────────────┴────────────┐
    │             0G Decentralized Network       │
    │                                           │
    │  ┌─────────────┐ ┌──────────┐ ┌────────┐  │
    │  │ 0G Compute   │ │0G Storage│ │0G Chain│  │
    │  │             │ │          │ │        │  │
    │  │ Flux Turbo  │ │ Merkle   │ │ERC-721 │  │
    │  │ TEE Node    │ │ Tree     │ │NFT     │  │
    │  │             │ │          │ │        │  │
    │  │ Inference   │ │ File     │ │Proven- │  │
    │  │ ZG-Res-Key  │ │ Upload   │ │ance    │  │
    │  │             │ │          │ │Record  │  │
    │  │ Provider    │ │ KV Store │ │Events  │  │
    │  │ Discovery   │ │ Log      │ │        │  │
    │  └─────────────┘ └──────────┘ └────────┘  │
    │                                           │
    │  Explorers: ChainScan · StorageScan        │
    │  Testnet: Galileo (Chain ID 16602)        │
    └───────────────────────────────────────────┘
```

---

## Web App Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      CREATE FLOW                              │
│                                                              │
│  [Prompt] ──→ actionGenerateImage() ──→ 0G Compute          │
│                                              │               │
│         ┌────────────────────────────────────┘               │
│         ▼                                                    │
│  [Image + Provenance] ──→ api/storage/upload ──→ 0G Storage │
│                                                      │       │
│         ┌────────────────────────────────────────────┘       │
│         ▼                                                    │
│  [Merkle Root] ──→ actionMintNFT() ──→ 0G Chain             │
│                                               │              │
│         ┌─────────────────────────────────────┘              │
│         ▼                                                    │
│  [Certificate + PDF] ──→ My Works (db.json)                  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                     VERIFY FLOW                               │
│                                                              │
│  [Upload Image] ──→ FileReader ──→ base64                    │
│                                       │                      │
│                                       ▼                      │
│  actionComputeMerkleRoot() ──→ ZgFile.merkleTree()           │
│                                       │                      │
│                                       ▼                      │
│  actionVerifyImage() ──→ contract.getProvenance()            │
│                                       │                      │
│                  ┌────────────────────┴──────────────┐       │
│                  ▼                                    ▼       │
│          ✅ Authentic                          ❌ Not Found   │
│          Provenance data                      Hash displayed  │
│          + ChainScan link                              │       │
│          + StorageScan link                    ┌───────┘       │
│          + PDF download                        ▼               │
│                                     [Wow Moment]               │
│                                     modifyOnePixel()           │
│                                     Hash diff display          │
└──────────────────────────────────────────────────────────────┘
```

---

## Agent Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    AGENT VERIFY FLOW                          │
│                                                              │
│  [Telegram Message]                                           │
│       │                                                      │
│       ├── Text: "verify this"                                │
│       └── Photo/File: [image bytes]                          │
│                │                                              │
│                ▼                                              │
│  ┌──────────────────────────────┐                            │
│  │  agentThink()                 │                            │
│  │  DeepSeek API                 │                            │
│  │  • System prompt              │                            │
│  │  • 4 tools available         │                            │
│  │  • tool_choice: "auto"       │                            │
│  └──────────────┬───────────────┘                            │
│                 │                                             │
│                 ▼                                             │
│  ┌──────────────────────────────┐                            │
│  │  Tool Call: verify_image     │                            │
│  │  { has_image: true }         │                            │
│  └──────────────┬───────────────┘                            │
│                 │                                             │
│                 ▼                                             │
│  ┌──────────────────────────────────────┐                    │
│  │  verifyImageData()                    │                    │
│  │                                      │                    │
│  │  1. downloadTelegramImage()          │                    │
│  │         │                             │                    │
│  │         ▼                             │                    │
│  │  2. computeMerkleRootFromBuffer()     │                    │
│  │         │                             │                    │
│  │         ▼                             │                    │
│  │  3. verifyProvenance() ──→ 0G Chain  │                    │
│  │         │                             │                    │
│  │         ▼                             │                    │
│  │  4. getTokenIdAndTxByMerkleRoot()     │                    │
│  │         │                             │                    │
│  │         ▼                             │                    │
│  │  5. generatePdfBuffer()               │                    │
│  │         │                             │                    │
│  │         ▼                             │                    │
│  │  6. recordVerification() + appendLog()│                    │
│  └──────────────┬───────────────────────┘                    │
│                 │                                             │
│                 ▼                                             │
│  ┌──────────────────────────────┐                            │
│  │  agentRespond()               │                            │
│  │  DeepSeek API                 │                            │
│  │  • Tool result + instructions │                            │
│  │  • Generates natural response │                            │
│  └──────────────┬───────────────┘                            │
│                 │                                             │
│    ┌────────────┴────────────┐                               │
│    ▼                         ▼                               │
│  [Telegram Message]    [PDF Document]                         │
│  Full provenance       Certificate of                         │
│  + all links           Authenticity                          │
│                 │                                             │
│                 ▼                                             │
│  ┌──────────────────────────────┐                            │
│  │  maybeSyncTo0G()              │                            │
│  │  (every 5 verifications)     │                            │
│  │  uploadBuffer() ──→ 0G Storage│                           │
│  └──────────────────────────────┘                            │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP                               │
│                                                                 │
│  layout.tsx                                                     │
│  ├── fonts: Newsreader + Inter                                  │
│  └── ClientRoot                                                 │
│       ├── AppProviders (RainbowKit/Wagmi)                       │
│       ├── SessionSync                                           │
│       ├── Nav (Black & Amber)                                   │
│       │    └── WalletBadge (ConnectButton)                      │
│       ├── WalletGate ── if !" / "                               │
│       │    ├── Connected? ──No──→ Vault Dial UI                 │
│       │    │    ├── Fingerprint icon                            │
│       │    │    ├── Concentric rings                            │
│       │    │    └── ConnectButton                               │
│       │    ├── Wrong Chain? ──→ Warning screen                  │
│       │    └── OK ──→ children                                  │
│       │         ├── / → HomePage (public)                       │
│       │         ├── /create → CreatePage                        │
│       │         ├── /verify → VerifyPage                        │
│       │         └── /my-works → MyWorksPage                     │
│       └── Footer (Black & Amber)                                │
│                                                                 │
│  globals.css                                                    │
│  └── @theme { Black & Amber tokens }                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     TELEGRAM AGENT                               │
│                                                                 │
│  bot.ts                                                         │
│  ├── Bot<BotContext>(TELEGRAM_BOT_TOKEN)                        │
│  ├── Commands: /start, /help, /stats                           │
│  ├── Handlers: :photo, :document, :text                        │
│  │    └── agentThink() → executeTool() → agentRespond()        │
│  └── main()                                                    │
│       ├── initMemory()    ← 0G Storage download                │
│       └── SIGINT → syncTo0G()  ← 0G Storage upload             │
│                                                                 │
│  Shared lib/ modules:                                           │
│  ├── lib/storage.ts    (ZgFile, Indexer, Merkle, uploadBuffer) │
│  ├── lib/contract.ts   (getProvenance, verifyProvenance,       │
│  │                      getTokenIdAndTxByMerkleRoot)           │
│  └── lib/types.ts      (Provenance, VerificationResult, etc.)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 0G Storage KV/Log Architecture

```
┌───────────────────────────────────────────────────────┐
│                  AGENT MEMORY LIFECYCLE                │
│                                                       │
│  STARTUP                                              │
│  ┌─────────────────────────────────────────┐         │
│  │ initMemory()                              │         │
│  │  1. Read .0g-kv-root → stateRoot, logRoot │         │
│  │  2. downloadFile(stateRoot) → 0G Storage   │         │
│  │  3. downloadFile(logRoot)   → 0G Storage   │         │
│  │  4. Write to agent-state.json, agent-log   │         │
│  │  5. If not found → use local files          │         │
│  └─────────────────────────────────────────┘         │
│                                                       │
│  RUNTIME                                              │
│  ┌─────────────────────────────────────────┐         │
│  │ recordVerification()                     │         │
│  │  → agent-state.json (immediate)          │         │
│  │  → agent-log.json (immediate)            │         │
│  │                                          │         │
│  │ maybeSyncTo0G() (every 5 ops)            │         │
│  │  → uploadBuffer(state) → 0G Storage      │         │
│  │  → uploadBuffer(log)   → 0G Storage      │         │
│  │  → Save Merkle Roots → .0g-kv-root       │         │
│  └─────────────────────────────────────────┘         │
│                                                       │
│  SHUTDOWN                                             │
│  ┌─────────────────────────────────────────┐         │
│  │ SIGINT handler                            │         │
│  │  → syncTo0G()                            │         │
│  │  → Final state + log uploaded             │         │
│  └─────────────────────────────────────────┘         │
│                                                       │
│  0G STORAGE INDEXER                                   │
│  ┌─────────────────────────────────────────┐         │
│  │ https://indexer-storage-testnet-turbo...│         │
│  │                                          │         │
│  │ StorageScan:                             │         │
│  │ https://storagescan.0g.ai/#/file/{root}  │         │
│  └─────────────────────────────────────────┘         │
└───────────────────────────────────────────────────────┘
```

---

## Contract Architecture

```
┌───────────────────────────────────────────────────────┐
│            ChainRightERC721 (Solidity)                  │
│                                                        │
│  STATE                                                 │
│  ┌──────────────────────────────────────────┐         │
│  │ records: bytes32 → ProvenanceRecord      │         │
│  │ tokenToRoot: uint256 → bytes32           │         │
│  │ creatorToRoots: address → bytes32[]      │         │
│  └──────────────────────────────────────────┘         │
│                                                        │
│  READ FUNCTIONS (used by agent + web)                 │
│  ┌──────────────────────────────────────────┐         │
│  │ getProvenance(bytes32) → ProvenanceRecord│         │
│  │ getProvenanceByToken(uint256) → Record   │         │
│  │ creatorWorksCount(address) → uint256     │         │
│  │ tokenURI(uint256) → string (on-chain)    │         │
│  └──────────────────────────────────────────┘         │
│                                                        │
│  WRITE FUNCTIONS (used by web create flow)            │
│  ┌──────────────────────────────────────────┐         │
│  │ mintWithProvenance(                      │         │
│  │   bytes32 merkleRoot,                    │         │
│  │   string zkResKey,                       │         │
│  │   string prompt,                         │         │
│  │   string model,                          │         │
│  │   string sequenceNumber                  │         │
│  │ ) → uint256 tokenId                      │         │
│  └──────────────────────────────────────────┘         │
│                                                        │
│  EVENTS (used by agent event query)                   │
│  ┌──────────────────────────────────────────┐         │
│  │ ProvenanceMinted(                        │         │
│  │   uint256 indexed tokenId,               │         │
│  │   bytes32 indexed merkleRoot,            │         │
│  │   address indexed creator,               │         │
│  │   string zkResKey,                       │         │
│  │   string prompt,                         │         │
│  │   string model,                          │         │
│  │   string sequenceNumber                  │         │
│  │ )                                         │         │
│  └──────────────────────────────────────────┘         │
│                                                        │
│  DEPLOYMENT                                           │
│  ┌──────────────────────────────────────────┐         │
│  │ Network: 0G Galileo Testnet               │         │
│  │ Chain ID: 16602                           │         │
│  │ evmVersion: cancun                        │         │
│  │ Compiler: 0.8.24                          │         │
│  │ Address: 0xE76B9fcb...                    │         │
│  └──────────────────────────────────────────┘         │
└───────────────────────────────────────────────────────┘
```

---

## Technology Stack Diagram

```
┌───────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                    │
│                                                       │
│  Next.js 15 · React 19 · Tailwind CSS v4              │
│  Black & Amber Design System (Stitch)                 │
│  RainbowKit · Wagmi · Viem                            │
│  Lucide React (icons)                                 │
├───────────────────────────────────────────────────────┤
│                   APPLICATION LAYER                    │
│                                                       │
│  Web: Server Actions · API Routes · Client Components │
│  Agent: grammY · tsx · Function Calling Loop          │
├───────────────────────────────────────────────────────┤
│                   INTELLIGENCE LAYER                   │
│                                                       │
│  DeepSeek chat API (NLP / Function Calling)           │
│  0G Compute · Flux Turbo (TEE-verified inference)    │
│  OpenAI fallback (user-consented)                     │
├───────────────────────────────────────────────────────┤
│                   PERSISTENCE LAYER                    │
│                                                       │
│  0G Storage · Merkle Trees · KV/Log                   │
│  db.json (web MVP) · agent-state.json (agent)         │
│  jsPDF (certificate generation)                       │
├───────────────────────────────────────────────────────┤
│                   BLOCKCHAIN LAYER                     │
│                                                       │
│  0G Chain · EVM (cancun) · ethers v6                  │
│  ChainRightERC721 · Hardhat · Solidity 0.8.24         │
└───────────────────────────────────────────────────────┘
```
