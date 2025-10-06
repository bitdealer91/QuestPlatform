// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

/// @title Somnia Weekly Keys (ERC-1155)
/// @notice One token per wallet per week id; mint is gated by server signature
contract Keys1155 is ERC1155, Ownable, EIP712 {
    using Strings for uint256;

    address public signer; // trusted off-chain signer
    string public baseURI;

    // prevent replay per signed digest
    mapping(bytes32 => bool) public used;
    // enforce one per wallet per id
    mapping(address => mapping(uint256 => bool)) public minted;

    bytes32 private constant MINT_TYPEHASH = keccak256(
        "Mint(address to,uint256 id,uint256 nonce,uint256 deadline,uint256 chainId,address verifyingContract)"
    );

    event SignerUpdated(address indexed signer);
    event BaseURIUpdated(string newBaseURI);

    constructor(string memory _baseURI, address _signer)
        ERC1155("")
        Ownable(msg.sender)
        EIP712("SomniaKeys", "1")
    {
        baseURI = _baseURI;
        signer = _signer;
        emit SignerUpdated(_signer);
        emit BaseURIUpdated(_baseURI);
    }

    function setSigner(address s) external onlyOwner {
        signer = s;
        emit SignerUpdated(s);
    }

    function setBaseURI(string calldata u) external onlyOwner {
        baseURI = u;
        emit BaseURIUpdated(u);
    }

    function uri(uint256 id) public view override returns (string memory) {
        if (bytes(baseURI).length == 0) return "";
        return string(abi.encodePacked(baseURI, id.toString(), ".json"));
    }

    /// @notice Signature-gated mint; one per wallet per id
    function mintWithSig(
        address to,
        uint256 id,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "expired");
        require(!minted[to][id], "already minted");

        bytes32 structHash = keccak256(
            abi.encode(
                MINT_TYPEHASH,
                to,
                id,
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
        minted[to][id] = true;
        _mint(to, id, 1, "");
    }
}



