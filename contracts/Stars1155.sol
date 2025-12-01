// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

/// @title Somnia Stars (ERC-1155)
/// @notice Signature-gated mint with variable amount; server controls allowance
contract Stars1155 is ERC1155, Ownable, EIP712 {
    using Strings for uint256;

    address public signer; // trusted off-chain signer
    string public baseURI;

    // prevent replay per signed digest
    mapping(bytes32 => bool) public used;

    bytes32 private constant MINT_TYPEHASH = keccak256(
        "Mint(address to,uint256 id,uint256 amount,uint256 nonce,uint256 deadline,uint256 chainId,address verifyingContract)"
    );

    event SignerUpdated(address indexed signer);
    event BaseURIUpdated(string newBaseURI);

    constructor(string memory _baseURI, address _signer)
        ERC1155("")
        Ownable(msg.sender)
        EIP712("SomniaStars", "1")
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

    /// @notice Signature-gated mint; variable amount controlled by off-chain policy
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


