// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title ChainRightERC721 v3
 * @author ChainRight Team
 * @notice ERC-721 con procedencia verificable para obras originales y asistidas por IA.
 *
 * @dev v3 agrega:
 *      - merkleRootOriginal: hash de la obra original (0x0 si es obra original)
 *      - parentTokenId: Token ID de la obra original (0 si es obra original)
 *      - mintProvenanceWithChain() para el flujo completo de edición IA
 *
 *      v2 agregó sequenceNumber (txSeq) al struct.
 *      v1 fue el lanzamiento inicial con 4-arg mintWithProvenance.
 */
contract ChainRightERC721 is ERC721, Ownable {
    using Counters for Counters.Counter;

    struct ProvenanceRecord {
        bytes32 merkleRoot;
        bytes32 merkleRootOriginal;  // 0x0 si la obra NO fue editada con IA
        string zkResKey;
        string prompt;               // prompt de edición (vacío si es obra original)
        string model;                // "none" si es obra original
        string sequenceNumber;
        uint256 parentTokenId;       // 0 si la obra NO fue editada con IA
        uint256 timestamp;
        address creator;
        bool exists;
    }

    Counters.Counter private _tokenIdCounter;
    mapping(bytes32 => ProvenanceRecord) public records;
    mapping(uint256 => bytes32) public tokenToRoot;
    mapping(address => bytes32[]) public creatorToRoots;
    mapping(uint256 => string) private _tokenMetadataUris;

    event ProvenanceMinted(
        uint256 indexed tokenId,
        bytes32 indexed merkleRoot,
        bytes32 indexed merkleRootOriginal,
        address creator,
        string zkResKey,
        string prompt,
        string model,
        string sequenceNumber,
        uint256 parentTokenId
    );

    constructor() ERC721("ChainRight Provenance NFT", "CRIGHT") {
        _tokenIdCounter.increment();
    }

    // ============================================
    // Helpers para strings
    // ============================================

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _toHexString(bytes32 value) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(66);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i] & 0x0f)];
        }
        return string(str);
    }

    function _toHexString(address addr) internal pure returns (string memory) {
        bytes memory s = new bytes(42);
        s[0] = "0";
        s[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint160(addr) >> (8 * (19 - i))));
            bytes1 hi = bytes1(uint8(b) >> 4);
            bytes1 lo = bytes1(uint8(b) & 0x0f);
            s[2 + i * 2] = hi < 0x0a ? bytes1(uint8(hi) + 0x30) : bytes1(uint8(hi) + 0x57);
            s[3 + i * 2] = lo < 0x0a ? bytes1(uint8(lo) + 0x30) : bytes1(uint8(lo) + 0x57);
        }
        return string(s);
    }

    function _escape(string memory str) internal pure returns (string memory) {
        bytes memory b = bytes(str);
        uint256 escapedCount = 0;
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] == '"' || b[i] == '\\') {
                escapedCount++;
            }
        }
        if (escapedCount == 0) return str;
        bytes memory result = new bytes(b.length + escapedCount);
        uint256 j = 0;
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] == '"' || b[i] == '\\') {
                result[j++] = '\\';
            }
            result[j++] = b[i];
        }
        return string(result);
    }

    // ============================================
    // Funciones públicas
    // ============================================

    /**
     * @dev Mintea un NFT con registro de procedencia completa (v3).
     *
     * Para obras ORIGINALES (sin IA):
     *   merkleRootOriginal_ = bytes32(0)
     *   parentTokenId_      = 0
     *   zkResKey_           = "" (vacío)
     *   prompt_             = "" (vacío)
     *   model_              = "none"
     *   sequenceNumber_     = txSeq de 0G Storage
     *
     * Para obras EDITADAS CON IA (Mode 2):
     *   merkleRootOriginal_ = hash de la obra original
     *   parentTokenId_      = Token ID de la obra original
     *   zkResKey_           = ZG-Res-Key de la inferencia
     *   prompt_             = prompt de edición
     *   model_              = modelo de IA (ej: "qwen-image-edit-2511")
     *   sequenceNumber_     = txSeq de la imagen editada
     */
    function mintProvenanceWithChain(
        bytes32 merkleRoot_,
        bytes32 merkleRootOriginal_,
        string calldata zkResKey_,
        string calldata prompt_,
        string calldata model_,
        string calldata sequenceNumber_,
        uint256 parentTokenId_
    ) public {
        require(!records[merkleRoot_].exists, "ChainRight: Already registered");
        require(merkleRoot_ != bytes32(0), "ChainRight: Invalid Merkle Root");

        // Si tiene parentTokenId, validar que el padre exista
        if (parentTokenId_ > 0) {
            require(ownerOf(parentTokenId_) != address(0), "ChainRight: Parent token does not exist");
        }

        uint256 tokenId = _tokenIdCounter.current();

        records[merkleRoot_] = ProvenanceRecord({
            merkleRoot: merkleRoot_,
            merkleRootOriginal: merkleRootOriginal_,
            zkResKey: zkResKey_,
            prompt: prompt_,
            model: model_,
            sequenceNumber: sequenceNumber_,
            parentTokenId: parentTokenId_,
            timestamp: block.timestamp,
            creator: msg.sender,
            exists: true
        });

        tokenToRoot[tokenId] = merkleRoot_;
        creatorToRoots[msg.sender].push(merkleRoot_);
        _safeMint(msg.sender, tokenId);
        _tokenIdCounter.increment();

        emit ProvenanceMinted(
            tokenId,
            merkleRoot_,
            merkleRootOriginal_,
            msg.sender,
            zkResKey_,
            prompt_,
            model_,
            sequenceNumber_,
            parentTokenId_
        );
    }

    /**
     * @dev Setea la metadata URI para un token (después de subir JSON a Storage).
     */
    function setTokenMetadataUri(uint256 tokenId, string calldata metadataUri) public {
        require(_exists(tokenId), "ChainRight: Token does not exist");
        require(
            ownerOf(tokenId) == msg.sender || owner() == msg.sender,
            "ChainRight: Not authorized"
        );
        _tokenMetadataUris[tokenId] = metadataUri;
    }

    function tokenMetadataUri(uint256 tokenId) public view returns (string memory) {
        require(_exists(tokenId), "ChainRight: Token does not exist");
        return _tokenMetadataUris[tokenId];
    }

    /**
     * @dev Consulta registro de procedencia por Merkle Root (v3).
     *      Devuelve 10 valores incluyendo merkleRootOriginal y parentTokenId.
     */
    function getProvenance(bytes32 merkleRoot_)
        public
        view
        returns (
            bytes32 merkleRoot,
            bytes32 merkleRootOriginal,
            string memory zkResKey,
            string memory prompt,
            string memory model,
            string memory sequenceNumber,
            uint256 parentTokenId,
            uint256 timestamp,
            address creator,
            bool exists
        )
    {
        ProvenanceRecord storage record = records[merkleRoot_];
        return (
            record.merkleRoot,
            record.merkleRootOriginal,
            record.zkResKey,
            record.prompt,
            record.model,
            record.sequenceNumber,
            record.parentTokenId,
            record.timestamp,
            record.creator,
            record.exists
        );
    }

    function getProvenanceByToken(uint256 tokenId)
        public
        view
        returns (
            bytes32 merkleRoot,
            bytes32 merkleRootOriginal,
            string memory zkResKey,
            string memory prompt,
            string memory model,
            string memory sequenceNumber,
            uint256 parentTokenId,
            uint256 timestamp,
            address creator,
            bool exists
        )
    {
        require(_exists(tokenId), "ChainRight: Token does not exist");
        bytes32 root = tokenToRoot[tokenId];
        return getProvenance(root);
    }

    function creatorWorksCount(address creator) public view returns (uint256) {
        return creatorToRoots[creator].length;
    }

    function creatorWork(address creator, uint256 index) public view returns (bytes32) {
        require(index < creatorToRoots[creator].length, "ChainRight: Index out of range");
        return creatorToRoots[creator][index];
    }

    /**
     * @dev Devuelve Token URI con metadata COMPLETA on-chain (v3).
     *      Incluye parentTokenId y merkleRootOriginal si existen.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ChainRight: Token does not exist");

        string memory savedUri = _tokenMetadataUris[tokenId];
        if (bytes(savedUri).length > 0) {
            return savedUri;
        }

        bytes32 root = tokenToRoot[tokenId];
        ProvenanceRecord storage record = records[root];

        string memory name = string(abi.encodePacked("ChainRight Provenance #", _toString(tokenId)));
        string memory description = "Verifiable provenance certified on 0G Chain.";
        string memory imageUrl = string(abi.encodePacked("https://storagescan.0g.ai/#/file/", _toHexString(root)));
        string memory externalUrl = string(abi.encodePacked("https://chainright.xyz/verify/", _toString(tokenId)));

        bool hasParent = record.parentTokenId > 0;

        // Construir atributos base
        bytes memory attributes = abi.encodePacked(
            '{"trait_type":"Mode","value":"', hasParent ? "AI-Assisted" : "Original", '"},',
            '{"trait_type":"Creator Wallet","value":"', _toHexString(record.creator), '"},',
            '{"trait_type":"Merkle Root","value":"', _toHexString(root), '"},',
            '{"trait_type":"Model","value":"', _escape(record.model), '"},'
        );

        // Si tiene prompt (edición IA), incluirlo
        if (bytes(record.prompt).length > 0) {
            attributes = abi.encodePacked(
                attributes,
                '{"trait_type":"Edit Prompt","value":"', _escape(record.prompt), '"},'
            );
        }

        // Agregar campos comunes
        attributes = abi.encodePacked(
            attributes,
            '{"trait_type":"Sequence Number","value":"', _escape(record.sequenceNumber), '"},',
            '{"trait_type":"ZK Resource Key","value":"', _escape(record.zkResKey), '"},',
            '{"trait_type":"Minted At","value":"', _toString(record.timestamp), '"},'
        );

        // Si tiene parent (obra editada con IA), mostrar el vínculo
        if (hasParent) {
            attributes = abi.encodePacked(
                attributes,
                '{"trait_type":"Parent Token ID","value":"', _toString(record.parentTokenId), '"},',
                '{"trait_type":"Original Merkle Root","value":"', _toHexString(record.merkleRootOriginal), '"},'
            );
        }

        attributes = abi.encodePacked(
            attributes,
            '{"trait_type":"Chain","value":"0G Galileo Testnet"}'
        );

        bytes memory json = abi.encodePacked(
            '{"name":"', _escape(name), '",',
            '"description":"', _escape(description), '",',
            '"image":"', imageUrl, '",',
            '"external_url":"', externalUrl, '",',
            '"attributes":[', attributes, ']}'
        );

        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(json)
        ));
    }
}
