// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ChainRightERC721
 * @author ChainRight Team
 * @notice ERC-721 con procedencia verificable para imágenes generadas por IA.
 * @dev Cada NFT minteado guarda:
 *      - Merkle Root de la imagen en 0G Storage
 *      - ZG-Res-Key de la inferencia en 0G Compute
 *      - Prompt, modelo, timestamp, y creador original
 * 
 *      Esto permite que CUALQUIER persona verifique la autenticidad de una imagen
 *      simplemente calculando su Merkle Root y consultando este contrato.
 *      
 *      Si modificás UN SOLO PÍXEL de la imagen, el Merkle Root cambia.
 *      No se puede falsificar.
 */
contract ChainRightERC721 is ERC721, Ownable {
    using Counters for Counters.Counter;

    // ============ Estructuras ============

    /**
     * @dev Registro de procedencia de una obra.
     *      Guardado on-chain, inmutable, irrefutable.
     */
    struct ProvenanceRecord {
        bytes32 merkleRoot;      // Hash único de la imagen en 0G Storage
        string zkResKey;         // ID único de la inferencia en 0G Compute (ZG-Res-Key header)
        string prompt;           // Prompt exacto usado para generar la imagen
        string model;            // Modelo de IA usado (ej: "Flux Turbo", "DeepSeek V3.1")
        uint256 timestamp;       // Bloque cuando se minteó
        address creator;         // Wallet del creador original
        bool exists;             // Flag para saber si este registro existe
    }

    // ============ Estado ============

    Counters.Counter private _tokenIdCounter;

    /**
     * @dev Mapping de Merkle Root => Registro de procedencia.
     *      Esta es la clave para la verificación:
     *      Cualquier persona calcula el Merkle Root de una imagen,
     *      consulta este mapping, y ve si existe un registro.
     */
    mapping(bytes32 => ProvenanceRecord) public records;

    /**
     * @dev Mapping de Token ID => Merkle Root.
     *      Para consultar la procedencia de un NFT específico.
     */
    mapping(uint256 => bytes32) public tokenToRoot;

    /**
     * @dev Mapping de Creator => Array de Merkle Roots.
     *      Para ver todas las obras de un creador.
     */
    mapping(address => bytes32[]) public creatorToRoots;

    // ============ Eventos ============

    /**
     * @dev Emitido cuando se minteó un nuevo NFT con procedencia.
     */
    event ProvenanceMinted(
        uint256 indexed tokenId,
        bytes32 indexed merkleRoot,
        address indexed creator,
        string zkResKey,
        string prompt,
        string model
    );

    // ============ Constructor ============

    constructor() ERC721("ChainRight Provenance NFT", "CRIGHT") {
        // Token IDs empiezan en 1
        _tokenIdCounter.increment();
    }

    // ============ Funciones Públicas ============

    /**
     * @dev Mintea un NFT con registro de procedencia.
     *      CUALQUIER wallet puede llamar esta función (no solo owner).
     *      Esto es para la demo — en producción podrías agregar acceso controlado.
     *
     * @param merkleRoot_ bytes32 — Merkle Root de la imagen en 0G Storage
     * @param zkResKey_ string — ZG-Res-Key de la inferencia en 0G Compute
     * @param prompt_ string — Prompt exacto usado
     * @param model_ string — Modelo de IA usado
     
     *
     * @dev REGLAS IMPORTANTES:
     *      1. Un Merkle Root SOLO puede ser minteado UNA VEZ.
     *         Si alguien ya registró esa imagen, no se puede volver a mintear.
     *      2. El msg.sender es guardado como creator.
     *      3. El timestamp es el del bloque actual — INMUTABLE.
     */
    function mintWithProvenance(
        bytes32 merkleRoot_,
        string calldata zkResKey_,
        string calldata prompt_,
        string calldata model_
        //string calldata metadataUri_
    ) public {
        // ============ Validaciones ============

        // Un Merkle Root solo se puede registrar una vez
        require(!records[merkleRoot_].exists, "ChainRight: Esta imagen ya fue registrada");

        // Merkle Root no puede ser bytes32(0)
        require(merkleRoot_ != bytes32(0), "ChainRight: Merkle Root invalido");

        // ============ Crear Registro ============

        uint256 tokenId = _tokenIdCounter.current();

        // Guardar el registro de procedencia
        records[merkleRoot_] = ProvenanceRecord({
            merkleRoot: merkleRoot_,
            zkResKey: zkResKey_,
            prompt: prompt_,
            model: model_,
            timestamp: block.timestamp,
            creator: msg.sender,
            exists: true
        });

        // Mapear tokenId => merkleRoot
        tokenToRoot[tokenId] = merkleRoot_;

        // Agregar a la lista del creador
        creatorToRoots[msg.sender].push(merkleRoot_);

        // ============ Mintear NFT ============

        _safeMint(msg.sender, tokenId);

        // Incrementar para el próximo
        _tokenIdCounter.increment();

        // ============ Emitir Evento ============

        emit ProvenanceMinted(
            tokenId,
            merkleRoot_,
            msg.sender,
            zkResKey_,
            prompt_,
            model_
        );
    }

    /**
     * @dev Consulta el registro completo de procedencia por Merkle Root.
     *      Esta es la función principal para VERIFICAR autenticidad.
     *
     * @param merkleRoot_ bytes32 — Merkle Root a consultar
     */
    function getProvenance(bytes32 merkleRoot_)
        public
        view
        returns (
            bytes32 merkleRoot,
            string memory zkResKey,
            string memory prompt,
            string memory model,
            uint256 timestamp,
            address creator,
            bool exists
        )
    {
        ProvenanceRecord storage record = records[merkleRoot_];

        return (
            record.merkleRoot,
            record.zkResKey,
            record.prompt,
            record.model,
            record.timestamp,
            record.creator,
            record.exists
        );
    }

    /**
     * @dev Consulta la procedencia por Token ID.
     */
    function getProvenanceByToken(uint256 tokenId)
        public
        view
        returns (
            bytes32 merkleRoot,
            string memory zkResKey,
            string memory prompt,
            string memory model,
            uint256 timestamp,
            address creator,
            bool exists
        )
    {
        require(_exists(tokenId), "ChainRight: Token no existe");

        bytes32 root = tokenToRoot[tokenId];
        return getProvenance(root);
    }

    /**
     * @dev Devuelve la cantidad de obras de un creador.
     */
    function creatorWorksCount(address creator) public view returns (uint256) {
        return creatorToRoots[creator].length;
    }

    /**
     * @dev Devuelve el Merkle Root en el índice especificado para un creador.
     */
    function creatorWork(address creator, uint256 index) public view returns (bytes32) {
        require(index < creatorToRoots[creator].length, "ChainRight: Indice fuera de rango");
        return creatorToRoots[creator][index];
    }

    /**
     * @dev Override de tokenURI para demo.
     *      En producción podrías devolver una metadata URI real.
     */
    function tokenURI(uint256 /* tokenId */) public pure override returns (string memory) {
        // DEMO: Devolvemos una metadata hardcodeada simple
        // En producción: ipfs://... o https://...
        return "data:application/json;base64,eyJuYW1lIjoiQ2hhaW5SaWdodCBQcm92ZW5hbmNlIE5GVCIsImRlc2NyaXB0aW9uIjoiTkZUIHdpdGggdmVyaWZpYWJsZSBwcm92ZW5hbmNlIG9uLWNoYWluIn0=";
    }
}
