# ChainRight
> Procedencia verificable para imágenes generadas con IA. Demostrá que sos el creador original.

## The Problem

Cuando generás imágenes con herramientas de IA (Midjourney, DALL-E, Flux), no tenés forma de demostrar:
- Que VOS fuiste el que generó esa imagen
- En QUÉ FECHA la generaste
- Con QUÉ prompt y QUÉ modelo exacto

El problema es real: hice portadas de libros con IA, fueron exitosas, pero ahora la gente las está usando para otras cosas sin mi autorización. Y como es IA, verdaderamente no puedo hacer nada para comprobar la originalidad.

Hoy, cualquier persona puede copiar tu imagen, mintirla como propia, y nadie podría demostrar lo contrario. Las imágenes de IA no tienen "certificado de nacimiento".

## Target Audience

- Artistas digitales que usan IA
- Escritores/autores que generan portadas
- Creadores de contenido que necesitan probar autoría
- Coleccionistas de NFTs que quieren autenticidad real

## Why Now

1. La generación de imágenes con IA es mainstream — millones de imágenes se crean por día
2. El problema del robo y la falsificación crece exponencialmente
3. 0G trae la tecnología necesaria: Compute (TEE-verified) + Storage (Merkle proofs) + Chain (EVM) — todo integrado nativamente
4. Ninguna solución actual combina IA + procedencia verificable on-chain de forma nativa

## The Solution

ChainRight le da a cada imagen generada por IA un registro público, permanente y verificable:

1. **Generás** la imagen via 0G Compute (Flux Turbo, nodo TEE-verified)
2. **Almacenás** la imagen + metadata en 0G Storage → obtenés un Merkle Root único
3. **Registrás** en 0G Chain: el Merkle Root + ZG-Res-Key (ID único de la inferencia) + prompt + timestamp
4. **Minteás** un NFT que representa esa obra con procedencia real

Cualquier persona, en cualquier momento, puede verificar:
- La imagen coincide con el Merkle Root registrado
- La inferencia existe y fue ejecutada en la fecha registrada
- La wallet que minteó es la misma que ejecutó la inferencia

## The Demo Flow

> Esto es lo que van a ver los jueces. Optimizado para el wow moment.

1. Usuario abre ChainRight y ve pantalla de inicio con dos opciones: "Crear Obra" y "Verificar Autenticidad"
2. Usuario elige "Crear Obra", escribe un prompt: "portada de libro cyberpunk con un programador mirando al horizonte"
3. Usuario clickea "Generar"
   - Sistema: Descubre provider de text-to-image en 0G Compute
   - Sistema: Verifica balance, transfiere fondos si es necesario
   - Sistema: Ejecuta inferencia con Flux Turbo
   - Sistema: Llama processResponse() para fee settlement
4. Sistema muestra la imagen generada + datos de procedencia:
   - Merkle Root (hash único de la imagen)
   - ZG-Res-Key (ID único de la inferencia)
   - Prompt usado
   - Modelo: Flux Turbo
   - Timestamp
5. Usuario clickea "Guardar en 0G Storage"
   - Sistema: Genera Merkle Tree
   - Sistema: Upload a 0G Storage
   - Sistema: Cierra file handle en finally block
6. Usuario clickea "Mintear NFT"
   - Sistema: Conecta wallet (MetaMask)
   - Sistema: Escribe en contrato ChainRightERC721
   - Sistema: Espera confirmación de bloque
7. **Wow Moment**: Sistema muestra "NFT minteado exitosamente" con:
   - Token ID
   - Address del contrato
   - Link al explorador de 0G Chain
8. Bonus: Usuario va a "Verificar Autenticidad", sube la MISMA imagen
   - Sistema: Calcula Merkle Root
   - Sistema: Busca en el contrato
   - Sistema: Muestra "✅ Autenticidad Confirmada" + todos los datos de procedencia
9. **Wow Moment 2**: Usuario modifica UN PÍXEL de la imagen, intenta verificar
   - Sistema: Muestra "❌ No coincide con ningún registro"

## Features

> Solo lo que llega a la demo. Todo lo demás cortado.

| # | Feature | In demo? |
|---|---|---|
| 1 | Generar imagen con AI (Flux Turbo via 0G Compute) | ✅ yes |
| 2 | Almacenar imagen en 0G Storage con Merkle proof | ✅ yes |
| 3 | Mintear NFT con procedencia on-chain | ✅ yes |
| 4 | Verificar autenticidad de cualquier imagen | ✅ yes |
| 5 | Perfil de usuario / galería personal | 🔴 cut |
| 6 | Historial completo de transacciones | 🔴 cut |
| 7 | Transferencias de NFT entre usuarios | 🔴 cut |
| 8 | Royalties / secondary sales | 🔴 cut |

## The Pitch Line

"Generaste una imagen con IA? Ahora podés demostrar que sos el creador. ChainRight le da procedencia verificable a cada obra de IA."

## Why Blockchain

No es "blockchain por blockchain". Es que esta solución ES IMPOSIBLE sin las propiedades de 0G:

1. **Permanencia**: El registro nunca se borra, nunca se modifica. Un servidor centralizado podría cambiar los registros.
2. **Verificabilidad**: Cualquiera puede verificar sin pedir permiso a ninguna empresa.
3. **TEE + Chain**: 0G Compute ejecuta en Trusted Execution Environment + el resultado se registra on-chain. Es la única forma de decir "esta inferencia REALMENTE pasó" sin tener que confiar en nadie.

## User's Wallet Experience

Los usuarios necesitan:
- Una wallet browser como MetaMask (configurada para 0G Testnet)
- Tokens 0G de testnet (del faucet: https://faucet.0g.ai)

No necesitan tokens para empezar a generar — solo para mintear el NFT on-chain.
