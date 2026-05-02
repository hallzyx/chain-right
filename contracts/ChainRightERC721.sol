// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title ChainRightERC721
 * @author ChainRight Team
 * @notice ERC-721 con procedencia verificable para imágenes generadas por IA.
 * @dev Cada NFT minteado guarda:
 *      - Merkle Root de la imagen en 0G Storage
 *      - ZG-Res-Key de la inferencia en 0G Compute
 *      - Sequence Number (txSeq) de la submission en 0G Storage
 *      - Prompt, modelo, timestamp, y creador original
 */
contract ChainRightERC721 is ERC721, Ownable {
    using Counters for Counters.Counter;

    struct ProvenanceRecord {
        bytes32 merkleRoot;
        string zkResKey;
        string prompt;
        string model;
        string sequenceNumber; // txSeq de 0G Storage — linkea a storagescan-galileo
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
        address indexed creator,
        string zkResKey,
        string prompt,
        string model,
        string sequenceNumber
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
     * @dev Mintea un NFT con registro de procedencia.
     * @param merkleRoot_ Merkle Root de la imagen en 0G Storage
     * @param zkResKey_ ZG-Res-Key de la inferencia en 0G Compute
     * @param prompt_ Prompt exacto usado
     * @param model_ Modelo de IA usado
     * @param sequenceNumber_ txSeq de la submission en 0G Storage
     */
    function mintWithProvenance(
        bytes32 merkleRoot_,
        string calldata zkResKey_,
        string calldata prompt_,
        string calldata model_,
        string calldata sequenceNumber_
    ) public {
        require(!records[merkleRoot_].exists, "ChainRight: Already registered");
        require(merkleRoot_ != bytes32(0), "ChainRight: Invalid Merkle Root");

        uint256 tokenId = _tokenIdCounter.current();

        records[merkleRoot_] = ProvenanceRecord({
            merkleRoot: merkleRoot_,
            zkResKey: zkResKey_,
            prompt: prompt_,
            model: model_,
            sequenceNumber: sequenceNumber_,
            timestamp: block.timestamp,
            creator: msg.sender,
            exists: true
        });

        tokenToRoot[tokenId] = merkleRoot_;
        creatorToRoots[msg.sender].push(merkleRoot_);
        _safeMint(msg.sender, tokenId);
        _tokenIdCounter.increment();

        emit ProvenanceMinted(tokenId, merkleRoot_, msg.sender, zkResKey_, prompt_, model_, sequenceNumber_);
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
     * @dev Consulta registro de procedencia por Merkle Root.
     */
    function getProvenance(bytes32 merkleRoot_)
        public
        view
        returns (
            bytes32 merkleRoot,
            string memory zkResKey,
            string memory prompt,
            string memory model,
            string memory sequenceNumber,
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
            record.sequenceNumber,
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
            string memory zkResKey,
            string memory prompt,
            string memory model,
            string memory sequenceNumber,
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
     * @dev Devuelve Token URI con metadata COMPLETA on-chain.
     *      Si hay una metadata URI guardada, la devuelve.
     *      Si no, genera metadata dinámica on-chain con TODOS los atributos.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ChainRight: Token does not exist");

        // 1. Primero: intentar con metadata URI guardada
        string memory savedUri = _tokenMetadataUris[tokenId];
        if (bytes(savedUri).length > 0) {
            return savedUri;
        }

        // 2. Fallback: generar metadata ON-CHAIN con TODOS los atributos
        bytes32 root = tokenToRoot[tokenId];
        ProvenanceRecord storage record = records[root];

        string memory name = string(abi.encodePacked("ChainRight Provenance #", _toString(tokenId)));
        string memory description = "Verifiable AI-generated image. Provenance certified on 0G Chain.";
        string memory imageUrl = string(abi.encodePacked("https://storagescan.0g.ai/#/file/", _toHexString(root)));
        string memory externalUrl = string(abi.encodePacked("https://chainright.xyz/verify/", _toString(tokenId)));

        // Construir atributos
        bytes memory attributes = abi.encodePacked(
            '{"trait_type":"Prompt","value":"', _escape(record.prompt), '"},',
            '{"trait_type":"Model","value":"', _escape(record.model), '"},',
            '{"trait_type":"Generator","value":"0G Compute (TEE-verified)"},',
            '{"trait_type":"Merkle Root","value":"', _toHexString(root), '"},',
            '{"trait_type":"ZK Resource Key","value":"', _escape(record.zkResKey), '"},',
            '{"trait_type":"Sequence Number","value":"', _escape(record.sequenceNumber), '"},',
            '{"trait_type":"Creator Wallet","value":"', _toHexString(record.creator), '"},',
            '{"trait_type":"Minted At","value":"', _toString(record.timestamp), '"},',
            '{"trait_type":"Chain","value":"0G Galileo Testnet"}'
        );

        // Construir JSON completo
        bytes memory json = abi.encodePacked(
            '{"name":"', _escape(name), '",',
            '"description":"', _escape(description), '",',
            '"image":"', imageUrl, '",',
            '"external_url":"', externalUrl, '",',
            '"attributes":[', attributes, ']}'
        );

        // Codificar en base64 usando OpenZeppelin
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(json)
        ));
    }
}
