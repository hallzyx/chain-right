# Userflow — Generate and Mint Artwork

## Actors

- Creator user
- 0G Compute Network
- 0G Storage Network
- 0G Chain (ChainRightERC721 contract)

## Preconditions

- User has MetaMask installed
- User has 0G testnet tokens (from the faucet)
- User is on the "Create Artwork" page

## On-Chain Data (ChainRightERC721 v2)

```solidity
struct ProvenanceRecord {
    bytes32 merkleRoot;
    string zkResKey;
    string prompt;
    string model;
    string sequenceNumber; // txSeq from 0G Storage — links to storagescan-galileo
    uint256 timestamp;
    address creator;
    bool exists;
}
```

- **Contract address (v2)**: `0xE76B9fcbf59B4eBE7CE6c41939BA68D65c65Bb44`
- **Chain**: 0G Galileo Testnet (Chain ID: 16602)
- **`mintWithProvenance` signature**: `(bytes32 merkleRoot_, string zkResKey_, string prompt_, string model_, string sequenceNumber_)`

## Steps

### Step 1: User enters a prompt

1. User types in the input: "cyberpunk book cover with a programmer looking at the horizon, retro-futuristic style"
2. User clicks the **"Generate Image"** button

**System response:**
- Disables the button, shows loading state
- Auto-activates `provider-discovery`: searches for `text-to-image` providers
- Filters by TEE-verified (`service[10] === true`)
- Selects the first available provider

### Step 2: Verify and prepare account

**System response:**
- Auto-activates `account-management`:
  1. Checks balance on the main account via `broker.ledger.getLedger()`
  2. If balance is insufficient: shows message "You need to deposit 0G tokens. Use the faucet: https://faucet.0g.ai"
  3. If balance OK: transfers funds to the provider sub-account via `broker.ledger.transferFund(providerAddress, 'inference', amount)`
  4. Acknowledges provider (first time): `broker.inference.acknowledgeProviderSigner(providerAddress)`

### Step 3: Run inference

**System response:**
- Gets service metadata: `broker.inference.getServiceMetadata(providerAddress)`
- Generates auth headers: `broker.inference.getRequestHeaders(providerAddress, JSON.stringify(body))`
- POSTs to `${endpoint}/images/generations` with:
  ```json
  {
    "model": "flux-turbo",
    "prompt": "cyberpunk book cover with a programmer looking at the horizon, retro-futuristic style",
    "n": 1,
    "size": "1024x1024"
  }
  ```
- Receives response: base64 image or URL

### Step 4: CRITICAL — processResponse()

> THIS STEP IS MANDATORY. If you skip it, funds won't settle correctly.

**System response:**
- Extracts ChatID from the header FIRST:
  ```typescript
  let chatID = response.headers.get('ZG-Res-Key') || response.headers.get('zg-res-key');
  ```
- Text-to-image does not need usageData
- Calls `processResponse()` in the CORRECT order:
  ```typescript
  if (chatID) {
    await broker.inference.processResponse(providerAddress, chatID);
  }
  ```
- **Wrong order = SILENT error**: `processResponse(chatID, providerAddress)` ❌
- **Correct order**: `processResponse(providerAddress, chatID)` ✅

### Step 5: Show result

**System response:**
- Displays the generated image to the user
- Displays raw provenance data:
  - ✅ **ZG-Res-Key**: `<header_value>` (unique inference ID)
  - ✅ **Provider**: `<address>`
  - ✅ **Model**: Flux Turbo
  - ✅ **Prompt**: the text the user entered
  - ✅ **Timestamp**: current date/time
- Buttons enabled: **"Save to Storage"** and **"Mint NFT"**

### Step 6: Save to 0G Storage

User clicks **"Save to Storage"**

**System response:**
- Converts the image to a Blob and sends it via `multipart/form-data` to `POST /api/storage/upload`:
  ```typescript
  const form = new FormData();
  form.append("file", new File([blob], "chainright.png", { type: "image/png" }));

  const apiResp = await fetch("/api/storage/upload", {
    method: "POST",
    body: form,
  });
  const result = await apiResp.json();
  ```
- The API route (`/api/storage/upload`) internally:
  1. Extracts the file from the FormData
  2. Writes it to a temp file
  3. Creates `ZgFile` from the file path: `const file = await ZgFile.fromFilePath(tempPath)`
  4. Generates Merkle Tree: `const [tree, err] = await file.merkleTree()`
  5. If error, throws
  6. Gets Root Hash: `const rootHash = tree!.rootHash()`
  7. Uploads via Indexer: `const [tx, uploadErr] = await indexer.upload(file, RPC_URL, wallet)`
  8. **ALWAYS closes the file in finally**: `await file.close()`
  9. Cleans up the temp file in finally
- Extracts `txSeq` from the SDK response (field: `txSeq`, **not** `sequence`):
  ```typescript
  if (txObjAny.txSeq !== undefined && txObjAny.txSeq !== null) {
    sequenceNumber = String(txObjAny.txSeq);
  }
  ```
- Builds the StorageScan URL: `https://storagescan-galileo.0g.ai/submission/${sequenceNumber}`
- The API responds with:
  ```json
  {
    "success": true,
    "merkleRoot": "0x...",
    "transactionHash": "0x...",
    "sequenceNumber": "123",
    "submissionUrl": "https://storagescan-galileo.0g.ai/submission/123",
    "fileStorageUrl": "https://storagescan.0g.ai/#/file/0x..."
  }
  ```
- Displays to the user:
  - ✅ **Merkle Root**: `<hash>`
  - ✅ **Transaction**: `<tx_hash>`
  - ✅ **Sequence Number (txSeq)**: `<number>`
  - ✅ **Status**: Stored successfully

### Step 7: Connect Wallet

User clicks **"Mint NFT"**

**System response:**
- If wallet is not connected:
  1. Requests MetaMask connection via `eth_requestAccounts`
  2. Requests switch to 0G Testnet (Chain ID: 16602)
  3. If the user doesn't have the chain added: adds it via `wallet_addEthereumChain`
- Shows the connected address

### Step 8: Mint NFT on-chain

**System response:**
- Auto-activates `interact-contract` + `storage-plus-chain`:
  1. Creates a `ChainRightERC721` contract instance with ethers v6
  2. Prepares the parameters for `mintWithProvenance()` (5 params in v2):
     - `merkleRoot_`: bytes32 of the Storage Merkle Root
     - `zkResKey_`: string, the ZG-Res-Key from Compute
     - `prompt_`: string, the prompt
     - `model_`: string, the model ("Flux Turbo")
     - `sequenceNumber_`: string, the txSeq from 0G Storage
  3. Estimates gas: `const gas = await contract.mintWithProvenance.estimateGas(...)`
  4. Sends transaction: `const tx = await contract.mintWithProvenance(...)`
  5. Waits for confirmation: `const receipt = await tx.wait()`
- Extracts Token ID from the `ProvenanceMinted` event in the receipt logs
- **ALWAYS use ethers v6**:
  - ✅ `ethers.JsonRpcProvider`
  - ✅ `ethers.parseEther`
  - ✅ `contract.waitForDeployment()`
  - ✅ `await contract.getAddress()`
  - ❌ No `ethers.providers.JsonRpcProvider` (v5)
  - ❌ No `ethers.utils.parseEther` (v5)
  - ❌ No `contract.deployed()` (v5)

### Step 9: Confirmation and Certificate

**System response:**
- Persists the work to `db.json` via `POST /api/works` with all StorageScan fields:
  ```json
  {
    "wallet": "<address>",
    "title": "Artwork generated on ChainRight",
    "prompt": "...",
    "source": "0g-compute",
    "model": "Flux Turbo",
    "imageDataUrl": "...",
    "merkleRoot": "0x...",
    "storageTxHash": "0x...",
    "sequenceNumber": "123",
    "submissionUrl": "https://storagescan-galileo.0g.ai/submission/123",
    "fileStorageUrl": "https://storagescan.0g.ai/#/file/0x...",
    "tokenId": "1",
    "mintTxHash": "0x...",
    "status": "minted",
    "contractAddress": "0xE76B9fcbf59B4eBE7CE6c41939BA68D65c65Bb44"
  }
  ```
- Shows a success screen with the `CertificateCard` component containing:
  - 🎉 **NFT Minted Successfully!**
  - Certificate of Authorship card with:
    - The generated image thumbnail
    - Author, Model, Token ID, Sequence (txSeq), Prompt
    - **3 explorer buttons**:
      - "View Tx on ChainScan" → `https://chainscan-galileo.0g.ai/tx/{txHash}`
      - "View NFT on ChainScan" → `https://chainscan-galileo.0g.ai/nft/{contractAddress}/{tokenId}`
      - "View Submission on StorageScan" → `https://storagescan-galileo.0g.ai/submission/{txSeq}`
    - **"Download Certificate PDF"** button — generates a formal PDF with:
      - Token ID, Contract Address, Creator Wallet
      - AI Model, Prompt, Merkle Root
      - Sequence Number (txSeq), Storage Tx Hash, Mint Tx Hash
      - NFT and Storage verification URLs
      - Network info and legal disclaimer
- Bottom action buttons:
  - "View in My Works" (links to `/my-works`)
  - "Create Another" (resets the flow)

## Acceptance Criteria

- [ ] User can enter a prompt and generate an image via 0G Compute
- [ ] `processResponse()` is called after every inference
- [ ] ChatID is extracted from the `ZG-Res-Key` header FIRST
- [ ] Image is stored on 0G Storage and returns a valid Merkle Root
- [ ] `ZgFile` is properly closed in a `finally` block
- [ ] `txSeq` is extracted from the SDK response (field: `txSeq`, not `sequence`)
- [ ] StorageScan URL uses format `https://storagescan-galileo.0g.ai/submission/[txSeq]`
- [ ] Upload uses `multipart/form-data` via `POST /api/storage/upload`
- [ ] User can connect MetaMask to 0G Testnet
- [ ] NFT is successfully minted via the `ChainRightERC721` v2 contract
- [ ] `mintWithProvenance` receives 5 params: merkleRoot, zkResKey, prompt, model, sequenceNumber
- [ ] Transaction is confirmed on 0G Chain
- [ ] All provenance data is registered on-chain (including sequenceNumber)
- [ ] Work is persisted to `db.json` via `POST /api/works` with all StorageScan fields
- [ ] CertificateCard shows 3 explorer buttons + Download Certificate PDF
- [ ] Everything uses ethers **v6** (never v5)
- [ ] Contract compiled with `evmVersion: "cancun"`

## Demo Happy Path Only

Do not implement for the demo:
- Network error handling (show generic message)
- Automatic retries
- Multiple images per transaction
- localStorage history
