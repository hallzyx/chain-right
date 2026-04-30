# Userflow — Verificar Autenticidad

## Actors

- Usuario verificador (cualquier persona)
- 0G Storage Network
- 0G Chain (contrato ChainRightERC721)

## Preconditions

- Usuario tiene la imagen a verificar (puede ser la original o una copia)
- Contrato ChainRightERC721 está deployado en 0G Testnet

## Flow

### Paso 1: Usuario sube la imagen

1. Usuario navega a la página **"Verificar Autenticidad"**
2. Usuario clickea en **"Subir Imagen"** o arrastra y suelta el archivo
3. Sistema muestra el preview de la imagen

**System response:**
- Valida que el archivo sea una imagen (png, jpg, webp)
- Muestra botón **"Verificar"** habilitado

### Paso 2: Calcular Merkle Root localmente

Usuario clickea **"Verificar"**

**System response:**
- Auto-activa `merkle-verification`:
  1. Escribe la imagen en un archivo temporal
  2. Crea `ZgFile` desde el path
  3. Genera Merkle Tree: `const [tree, err] = await file.merkleTree()`
  4. Obtiene Root Hash: `const calculatedRoot = tree!.rootHash()`
  5. **Cierra el file**: `await file.close()`
  6. Limpia el archivo temporal
- **Importante**: El Merkle Root es ÚNICO por contenido. Si cambias UN SOLO PÍXEL, el hash cambia completamente.

### Paso 3: Buscar en el contrato on-chain

**System response:**
- Auto-activa `interact-contract`:
  1. Crea instancia del contrato `ChainRightERC721` (read-only, no necesita wallet)
  2. Llama a la función de consulta: `const record = await contract.getProvenance(calculatedRoot)`
  3. O si el mapping es por tokenId: busca todos los tokens y compara el merkleRoot

### Paso 4: Mostrar resultado

#### Caso A: ✅ Autenticidad Confirmada

Si se encontró un registro con ese Merkle Root:

**System response:**
- Muestra pantalla verde con check grande:
  - ✅ **AUTENTICIDAD CONFIRMADA**
  - Esta imagen está registrada en ChainRight
- Muestra todos los datos de procedencia on-chain:
  - **Token ID**: `<tokenId>`
  - **Creador Original**: `<wallet_address>`
  - **Fecha de Registro**: `<timestamp del bloque>`
  - **Prompt Original**: `<texto del prompt>`
  - **Modelo de IA**: `<Flux Turbo>`
  - **Merkle Root**: `<hash>` (coincide)
  - **ZG-Res-Key**: `<id de la inferencia>`
- Link para ver la transacción en el explorador

#### Caso B: ❌ No hay registro

Si NO se encontró ese Merkle Root en el contrato:

**System response:**
- Muestra pantalla roja:
  - ❌ **Sin Registro Encontrado**
  - Esta imagen no existe en los registros de ChainRight
- Explicación para el usuario:
  - El creador nunca la registró en ChainRight
  - O es una imagen GENERADA DESPUÉS y el hash no coincide
  - O fue modificada (aunque sea un píxel)

### Paso 5: Wow Moment - Modificando la imagen

> Para la demo, vamos a mostrar esto explícitamente.

**System response (opcional para demo):**
- Muestra botón: **"Modificar un píxel y volver a verificar"**
- Cuando el usuario clickea:
  1. Modifica UN SOLO PÍXEL de la imagen (cambia un valor RGB)
  2. Vuelve a calcular el Merkle Root
  3. Muestra:
     - Hash ANTES: `abc123...`
     - Hash AHORA: `xyz789...`
  4. Busca el nuevo hash → NO ENCONTRADO
- **Mensaje impactante para el jurado:**
  > "Mira esto. Cambiamos UN SOLO PÍXEL. El Merkle Root cambia completamente. 
  > Esto es lo que hace imposible falsificar una obra registrada en ChainRight."

## Acceptance Criteria

- [ ] Usuario puede subir cualquier imagen
- [ ] Sistema calcula el Merkle Root localmente usando 0G SDK
- [ ] `ZgFile` se cierra correctamente
- [ ] Sistema consulta el contrato ChainRightERC721 en 0G Chain
- [ ] Si existe: muestra todos los datos de procedencia
- [ ] Si no existe: muestra mensaje claro
- [ ] Demo: modificar un píxel cambia completamente el hash (wow moment)

## Datos que se guardan On-Chain

Por cada NFT minteado, el contrato guarda:

```solidity
struct ProvenanceRecord {
    bytes32 merkleRoot;      // Hash único de la imagen en 0G Storage
    string zkResKey;         // ID único de la inferencia en 0G Compute
    string prompt;           // Prompt exacto usado
    string model;            // Modelo de IA (ej: "Flux Turbo")
    uint256 timestamp;       // Bloque cuando se minteó
    address creator;         // Wallet del creador original
    bool exists;             // Flag de existencia
}

// Mapping: merkleRoot => ProvenanceRecord
mapping(bytes32 => ProvenanceRecord) public records;

// Mapping: tokenId => ProvenanceRecord (para ERC-721)
mapping(uint256 => bytes32) public tokenToRoot;
```

## Por qué esto funciona

| Attack vector | Qué pasa |
|---|---|
| Alguien roba tu imagen, la sube como propia | Su Merkle Root es el MISMO, pero el `creator` on-chain es TU wallet. El timestamp es ANTERIOR. |
| Alguien genera una imagen con el MISMO prompt | Flux Turbo (y cualquier modelo moderno) tiene aleatoriedad. Cada generación es distinta. Merkle Root distinto. |
| Alguien modifica UN PÍXEL de tu imagen | Merkle Root cambia COMPLETAMENTE. No coincide con ningún registro. |
| Alguien intenta mintir la fecha | El timestamp es el del BLOQUE en 0G Chain. Inmutable. Irrefutable. |

## Demo Happy Path Only

No implementar:
- Verificación por ZG-Res-Key (solo por Merkle Root para demo)
- Paginación de registros
- Filtros por fecha/creator
