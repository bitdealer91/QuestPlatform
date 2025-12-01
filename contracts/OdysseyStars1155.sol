// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

/// @title Odyssey Stars (ERC-1155)
/// @notice Signature-gated mint with variable amount; includes on-chain collection name and contractURI
contract OdysseyStars1155 is ERC1155, Ownable, EIP712 {
    using Strings for uint256;

    /// @dev Off-chain trusted signer for mint intents
    address public signer;

    /// @dev Collection/display name (some explorers/marketplaces will read this)
    string public name;

    /// @dev Base metadata URI (ERC-1155 style): uri(id) = baseURI + id + ".json"
    string public baseURI;

    /// @dev Optional contract-level metadata URI (used by some marketplaces)
    string public contractURI;

    // prevent replay per signed digest
    mapping(bytes32 => bool) public used;

    bytes32 private constant MINT_TYPEHASH = keccak256(
        "Mint(address to,uint256 id,uint256 amount,uint256 nonce,uint256 deadline,uint256 chainId,address verifyingContract)"
    );

    event SignerUpdated(address indexed signer);
    event BaseURIUpdated(string newBaseURI);
    event ContractURIUpdated(string newContractURI);
    event NameUpdated(string newName);

    constructor(
        string memory _name,
        string memory _baseURI,
        string memory _contractURI,
        address _signer
    )
        ERC1155("")
        Ownable(msg.sender)
        EIP712("OdysseyStars", "1")
    {
        name = _name;
        baseURI = _baseURI;
        contractURI = _contractURI;
        signer = _signer;
        emit NameUpdated(_name);
        emit BaseURIUpdated(_baseURI);
        emit ContractURIUpdated(_contractURI);
        emit SignerUpdated(_signer);
    }

    function setSigner(address s) external onlyOwner {
        signer = s;
        emit SignerUpdated(s);
    }

    function setBaseURI(string calldata u) external onlyOwner {
        baseURI = u;
        emit BaseURIUpdated(u);
    }

    function setContractURI(string calldata u) external onlyOwner {
        contractURI = u;
        emit ContractURIUpdated(u);
    }

    function setName(string calldata n) external onlyOwner {
        name = n;
        emit NameUpdated(n);
    }

    function uri(uint256 id) public view override returns (string memory) {
        if (bytes(baseURI).length == 0) return "";
        return string(abi.encodePacked(baseURI, id.toString(), ".json"));
    }

    /// @notice Signature-gated mint; variable amount controlled off-chain
    function mintWithSig(
        address to,
        uint256 id,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "expired");
        require(amount > 0, "zero amount");

        bytes32 structHash = keccak256(
            abi.encode(
                MINT_TYPEHASH,
                to,
                id,
                amount,
                nonce,
                deadline,
                block.chainid,
                address(this)
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        require(!used[digest], "used");

        address rec = ECDSA.recover(digest, signature);
        require(rec == signer, "bad sig");

        used[digest] = true;
        _mint(to, id, amount, "");
    }
}



