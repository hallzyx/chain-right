# ChainRight
> Verifiable provenance for AI-generated images. Prove you are the original creator.

## The Problem

When you generate images with AI tools (Midjourney, DALL-E, Flux), you have no way to prove:
- That YOU were the one who generated that image
- ON WHAT DATE you generated it
- With what PROMPT and what exact MODEL

The problem is real: I created book covers with AI, they were successful, but now people are using them for other things without my authorization. And since it's AI, I truly can't do anything to prove originality.

Today, anyone can copy your image, claim it as their own, and no one could prove otherwise. AI images have no "birth certificate."

## Target Audience

- Digital artists using AI
- Writers/authors generating cover art
- Content creators who need to prove authorship
- NFT collectors who want real authenticity

## Why Now

1. AI image generation is mainstream — millions of images are created every day
2. The problem of theft and forgery is growing exponentially
3. 0G delivers the necessary technology: Compute (TEE-verified) + Storage (Merkle proofs) + Chain (EVM) — all natively integrated
4. No current solution combines AI + verifiable on-chain provenance natively

## The Solution

ChainRight gives every AI-generated image a public, permanent, and verifiable provenance record stored entirely on-chain:

1. **Generate** the image via 0G Compute (Flux Turbo, TEE-verified node)
2. **Store** the image + metadata on 0G Storage → obtain a unique Merkle Root and a Sequence Number (txSeq)
3. **Register** on 0G Chain by minting an NFT containing the full provenance record:
   - **Merkle Root** — unique cryptographic fingerprint of the image
   - **ZG-Res-Key** — unique inference ID from 0G Compute
   - **Prompt** — exact text that generated the image
   - **Model** — AI model used (e.g., "Flux Turbo")
   - **Sequence Number** (txSeq) — on-chain submission number from 0G Storage
   - **Timestamp** — block timestamp when minted
   - **Creator** — wallet address of the original creator

Anyone, at any time, can verify:
- The image matches the registered Merkle Root (change one pixel → hash changes completely)
- The inference exists and was executed on the registered date
- The wallet that minted is the same that executed the inference

## The Demo Flow

> This is what the judges will see. Optimized for the wow moment.

### Homepage

User opens ChainRight and sees the landing page with two prominent options:
- **"Create Artwork"** — generate an image, store it, and mint an NFT with provenance
- **"Verify Authenticity"** — upload any image and verify it against the on-chain registry

### Create Flow (Generate → Store → Mint)

1. User chooses **"Create Artwork"**, writes a prompt: "cyberpunk book cover with a programmer looking at the horizon, retro-futuristic style"
2. User clicks **"Generate Image"**
   - System discovers text-to-image providers on 0G Compute
   - Verifies balance, transfers funds if needed
   - Executes inference with Flux Turbo
   - Calls `processResponse()` for fee settlement
3. System displays the generated image with provenance data:
   - ZG-Res-Key (unique inference ID)
   - Provider address
   - Model: Flux Turbo
   - Prompt used
4. User clicks **"Save to 0G Storage"**
   - System generates Merkle Tree
   - Uploads to 0G Storage
   - Captures the Sequence Number (txSeq) from the upload transaction
   - Closes file handle in finally block
5. User clicks **"Mint NFT"**
   - System connects wallet (MetaMask)
   - Writes to ChainRightERC721 contract with the full provenance record (including sequence number)
   - Waits for block confirmation
6. **Certificate of Authorship**: System displays a "Certificate of Authorship" card with:
   - Token ID, contract address, thumbnail, prompt, model, creator address
   - Three explorer buttons:
     - **ChainScan Tx** — link to the mint transaction
     - **NFT on ChainScan** — link to the NFT page
     - **StorageScan** — link to the submission on 0G Storage explorer
   - **Download Certificate PDF** — generates a legally presentable PDF document with all provenance data, including the Merkle Root, sequence number, and explorer links

### Verify Flow (Upload → Analyze → Result)

1. User navigates to **"Verify Authenticity"**, uploads an image
2. User clicks **"Verify Authenticity"**
3. System performs a real-time 5-step analysis with live on-chain data visible during each step:
   - **Step 1 — Read image file**: detects file size
   - **Step 2 — Compute cryptographic fingerprint (Merkle Tree)**: builds Merkle Tree over file segments, displays the computed Merkle Root
   - **Step 3 — Connect to 0G Chain**: displays the actual RPC URL, Chain ID (16602), and current block number
   - **Step 4 — Query smart contract**: shows the contract address and the exact query selector (e.g., `getProvenance(0xabc123...)`)
   - **Step 5 — Result**: found on-chain or not found
4. Result screen shows:
   - ✅ **Authenticity Confirmed** or ❌ **No Record Found**
   - Expandable accordion with the full 5-step analysis trace
   - The computed Merkle Root
   - On-chain provenance data (if confirmed): Creator, Model, Prompt, ZK Resource Key, Sequence Number (txSeq), Timestamp
   - Link to StorageScan (if sequence number present)
   - **Download Certificate PDF** button (for confirmed results)
5. **Wow Moment**: User clicks "View Wow Moment: Change ONE PIXEL"
   - System modifies 1 byte of the original image data
   - Displays a **split-screen visual comparison** of the original vs. modified image side by side (they look identical to the human eye)
   - **Character-by-character hash diff**: a forensic display of the two Merkle Roots rendered side by side, with matching characters in green and differing characters in red
   - **Similarity counter**: animates from 100% down to near 0%, visually demonstrating how a single pixel change destroys cryptographic similarity
   - **Statistics panel**: shows Chars Compared, Matching Chars, and Cryptographic Similarity
   - Conclusion message: "The hashes are COMPLETELY DIFFERENT. This is why it is cryptographically impossible to forge a work registered on ChainRight."

### My Works

A personal gallery page accessible from the app shell that shows the user's created works:
- Displays all works registered during the current session (MVP persistence via `db.json`)
- Each entry shows the thumbnail, prompt, model, and status
- Provides links to the explorer for each work

## Features

> Only what makes it to the demo. Everything else cut.

| # | Feature | In demo? |
|---|---|---|
| 1 | Generate image with AI (Flux Turbo via 0G Compute) | ✅ yes |
| 2 | Store image on 0G Storage with Merkle proof and Sequence Number (txSeq) | ✅ yes |
| 3 | Mint NFT with full provenance record on-chain | ✅ yes |
| 4 | Verify authenticity of any image (5-step real-time analysis with live on-chain data) | ✅ yes |
| 5 | Visual hash diff comparison (Wow Moment) | ✅ yes |
| 6 | Certificate of Authorship with 3 explorer buttons | ✅ yes |
| 7 | PDF Certificate download for legal proof | ✅ yes |
| 8 | "My Works" personal gallery page | ✅ yes |
| 9 | Manual verification by pasting Merkle Root (from PDF certificate) | ✅ yes |
| 10 | User profile / full account system | 🔴 cut |
| 11 | Complete transaction history | 🔴 cut |
| 12 | NFT transfers between users | 🔴 cut |
| 13 | Royalties / secondary sales | 🔴 cut |

## The Pitch Line

"You generated an AI image? Now you can prove you are the creator. ChainRight gives verifiable provenance to every AI artwork."

## Why Blockchain

This is not "blockchain for blockchain's sake." This solution is IMPOSSIBLE without 0G's properties:

1. **Permanence**: The record never gets erased, never gets modified. A centralized server could change the records at any time.
2. **Verifiability**: Anyone can verify without asking permission from any company.
3. **TEE + Chain**: 0G Compute runs in a Trusted Execution Environment, and the result is registered on-chain. It's the only way to say "this inference ACTUALLY happened" without having to trust anyone.

## User's Wallet Experience

Users need:
- A browser wallet like MetaMask (configured for 0G Testnet)
- 0G testnet tokens (from the faucet: https://faucet.0g.ai)

No tokens needed to generate — only to mint the NFT on-chain.

## PDF Certificate of Authorship

ChainRight generates a downloadable PDF certificate that serves as a legally presentable proof document. The certificate includes:
- Thumbnail of the original image
- Creator wallet address
- AI model and original prompt
- Token ID and contract address
- Merkle Root (cryptographic fingerprint)
- Sequence Number (on-chain submission reference)
- Timestamp of registration
- Direct links to ChainScan Tx, NFT viewer, and StorageScan
- QR-style unique URL for digital verification

The PDF can be used as legal proof of authorship, timestamped and cryptographically verifiable by anyone with the Merkle Root.

## The Wow Moment in Detail

The verification page features a "Wow Moment" experience designed to demonstrate the power of cryptographic hashing in a visually compelling way:

1. **Split-Screen Image Comparison**: The original and modified images are displayed side by side with a forensic scan line effect. A pulsing indicator highlights the modified pixel location. The images appear identical to the human eye — you cannot tell the difference visually.

2. **Character-by-Character Hash Diff**: Both Merkle Roots (original and modified) are rendered in a side-by-side grid. Each character is color-coded: green for matching, red for differing. After modifying just 1 byte, the entire hash becomes a sea of red — visually proving the avalanche effect of SHA-256.

3. **Animated Similarity Counter**: A counter labeled "Cryptographic Similarity" animates from 100% down to near 0%, reinforcing the mathematical certainty of the hash difference.

4. **Statistics Panel**: Shows Chars Compared, Matching Chars, and the final Cryptographic Similarity percentage.

5. **Conclusion**: "The hashes are COMPLETELY DIFFERENT. This is why it is cryptographically impossible to forge a work registered on ChainRight."
