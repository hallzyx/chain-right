# Userflow — Generar y Mintear Obra

## Actors

- Usuario creador
- 0G Compute Network
- 0G Storage Network
- 0G Chain (contrato ChainRightERC721)

## Preconditions

- Usuario tiene MetaMask instalado
- Usuario tiene tokens 0G en testnet (del faucet)
- Usuario está en la página "Crear Obra"

## Steps

### Paso 1: Usuario ingresa el prompt

1. Usuario escribe en el input: "portada de libro cyberpunk con un programador mirando al horizonte, estilo retro futurista"
2. Usuario clickea el botón **"Generar Imagen"**

**System response:**
- Deshabilita el botón, muestra loading state
- Auto-activa `provider-discovery`: busca providers de tipo `text-to-image`
- Filtra por TEE-verified (`service[10] === true`)
- Selecciona el primer provider disponible

### Paso 2: Verificar y preparar cuenta

**System response:**
- Auto-activa `account-management`:
  1. Verifica balance en la main account via `broker.ledger.getLedger()`
  2. Si balance es insuficiente: muestra mensaje "Necesitas depositar 0G tokens. Usa el faucet: https://faucet.0g.ai"
  3. Si balance OK: transfiere fondos al provider sub-account via `broker.ledger.transferFund(providerAddress, 'inference', amount)`
  4. Acknowledges provider (primera vez): `broker.inference.acknowledgeProviderSigner(providerAddress)`

### Paso 3: Ejecutar inferencia

**System response:**
- Obtiene metadata del servicio: `broker.inference.getServiceMetadata(providerAddress)`
- Genera headers de auth: `broker.inference.getRequestHeaders(providerAddress, JSON.stringify(body))`
- Hace POST a `${endpoint}/images/generations` con:
  ```json
  {
    "model": "flux-turbo",
    "prompt": "portada de libro cyberpunk con un programador mirando al horizonte, estilo retro futurista",
    "n": 1,
    "size": "1024x1024"
  }
  ```
- Recibe respuesta: imagen en base64 o URL

### Paso 4: CRÍTICO - processResponse()

> ESTE PASO ES OBLIGATORIO. Si te lo salteás, los fondos no se liquidan correctamente.

**System response:**
- Extrae ChatID del header PRIMERO:
  ```typescript
  let chatID = response.headers.get('ZG-Res-Key') || response.headers.get('zg-res-key');
  ```
- Text-to-image no necesita usageData
- Llama a `processResponse()` en el orden CORRECTO:
  ```typescript
  if (chatID) {
    await broker.inference.processResponse(providerAddress, chatID);
  }
  ```
- **Orden incorrecto = error SILENCIOSO**: `processResponse(chatID, providerAddress)` ❌
- **Orden correcto**: `processResponse(providerAddress, chatID)` ✅

### Paso 5: Mostrar resultado

**System response:**
- Muestra la imagen generada al usuario
- Muestra los datos de procedencia crudos:
  - ✅ **ZG-Res-Key**: `<valor_del_header>` (ID único de la inferencia)
  - ✅ **Provider**: `<address>`
  - ✅ **Modelo**: Flux Turbo
  - ✅ **Prompt**: el texto que ingresó el usuario
  - ✅ **Timestamp**: fecha/hora actual
- Botones habilitados: **"Guardar en Storage"** y **"Mintear NFT"**

### Paso 6: Guardar en 0G Storage

Usuario clickea **"Guardar en Storage"**

**System response:**
- Guarda la imagen en un archivo temporal (0G SDK requiere file path)
- Auto-activa `upload-file`:
  1. Crea `ZgFile` desde el path: `const file = await ZgFile.fromFilePath(tempPath)`
  2. Genera Merkle Tree: `const [tree, err] = await file.merkleTree()`
  3. Si hay error, throw
  4. Obtiene Root Hash: `const rootHash = tree!.rootHash()`
  5. Upload via Indexer: `const [tx, uploadErr] = await indexer.upload(file, RPC_URL, wallet)`
  6. **SIEMPRE cierra el file en finally**: `await file.close()`
- Limpia el archivo temporal
- Muestra al usuario:
  - ✅ **Merkle Root**: `<hash>`
  - ✅ **Transaction**: `<tx_hash>`
  - ✅ **Status**: Almacenado exitosamente

### Paso 7: Conectar Wallet

Usuario clickea **"Mintear NFT"**

**System response:**
- Si wallet no está conectada:
  1. Solicita conexión a MetaMask via `eth_requestAccounts`
  2. Solicita switch a 0G Testnet (Chain ID: 16602)
  3. Si el usuario no tiene la chain agregada: la agrega via `wallet_addEthereumChain`
- Muestra address conectada

### Paso 8: Mintear NFT on-chain

**System response:**
- Auto-activa `interact-contract` + `storage-plus-chain`:
  1. Crea instancia del contrato `ChainRightERC721` con ethers v6
  2. Prepara los parámetros para `mintWithProvenance()`:
     - `merkleRoot_`: bytes32 del Merkle Root de Storage
     - `zkResKey_`: string del ZG-Res-Key de Compute
     - `prompt_`: string del prompt
     - `model_`: string del modelo ("Flux Turbo")
     - `metadataUri_`: URI de metadata (podemos usar rootHash como identificador)
  3. Estima gas: `const gas = await contract.mintWithProvenance.estimateGas(...)`
  4. Envía transacción: `const tx = await contract.mintWithProvenance(...)`
  5. Espera confirmación: `const receipt = await tx.wait()`
- **SIEMPRE usa ethers v6**:
  - ✅ `ethers.JsonRpcProvider`
  - ✅ `ethers.parseEther`
  - ✅ `contract.waitForDeployment()`
  - ✅ `await contract.getAddress()`
  - ❌ No `ethers.providers.JsonRpcProvider` (v5)
  - ❌ No `ethers.utils.parseEther` (v5)
  - ❌ No `contract.deployed()` (v5)

### Paso 9: Confirmación y Wow Moment

**System response:**
- Muestra pantalla de éxito:
  - 🎉 **NFT Minteado Exitosamente!**
  - **Token ID**: `<tokenId>`
  - **Contract Address**: `<address>`
  - **Transaction Hash**: `<txHash>`
  - **Explorer Link**: `https://chainscan-galileo.0g.ai/tx/<txHash>`
- Botones:
  - "Ver en Explorer"
  - "Verificar Autenticidad" (lleva a la página de verificación)
  - "Crear otra obra"

## Acceptance Criteria

- [ ] Usuario puede ingresar un prompt y generar una imagen via 0G Compute
- [ ] `processResponse()` es llamado después de cada inferencia
- [ ] ChatID se extrae del header `ZG-Res-Key` PRIMERO
- [ ] Imagen se guarda en 0G Storage y devuelve un Merkle Root válido
- [ ] `ZgFile` se cierra correctamente en bloque `finally`
- [ ] Usuario puede conectar MetaMask a 0G Testnet
- [ ] NFT se mintea exitosamente via contrato `ChainRightERC721`
- [ ] Transacción se confirma en 0G Chain
- [ ] Todos los datos de procedencia quedan registrados on-chain
- [ ] Todo usa ethers **v6** (nunca v5)
- [ ] Contrato compilado con `evmVersion: "cancun"`

## Demo Happy Path Only

No implementar para la demo:
- Manejo de errores de red (mostrar mensaje genérico)
- Reintentos automáticos
- Múltiples imágenes por transacción
- Guardar historial en localStorage
