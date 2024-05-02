pragma solidity ^0.8.20;

/**
 @title MultiSigWallet
 @notice An off-chain multisig wallet implementation
 @dev Based on SimpleWallet (https://github.com/christianlundkvist/simple-multisig) and uses EIP-712 standard validate a signature
*/
//SPDX-License-Identifier: GPL-3.0
contract MultiSigWallet {
    // EIP712 Precomputed hashes:
    // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)")
    bytes32 constant EIP712DOMAINTYPE_HASH = 0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472;

    // keccak256("Securitize Off-Chain Multisig Wallet")
    bytes32 constant NAME_HASH = 0x46d502984e082ba64ca60958f0c45ceb3f34246aa789aa5e5ed15bced9fd4e89;

    // keccak256("1")
    bytes32 constant VERSION_HASH = 0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6;

    // keccak256("MultiSigTransaction(address destination,uint256 value,bytes data,uint256 nonce,address executor,uint256 gasLimit)")
    bytes32 constant TXTYPE_HASH = 0x3ee892349ae4bbe61dce18f95115b5dc02daf49204cc602458cd4c1f540d56d7;

    // keccak256("Securitize Off-Chain Multisig Wallet SALT")
    bytes32 constant SALT = 0xb37745e66c38577667d690143f874b67afebdda0d4baa8b47e7ec4f32a43ff12;

    uint256 public nonce; // (only) mutable state
    uint256 public threshold; // immutable state
    mapping(address => bool) isOwner; // immutable state
    address[] public ownersArr; // immutable state

    bytes32 DOMAIN_SEPARATOR; // hash for EIP712, computed from contract address

    // Note that owners_ must be strictly increasing, in order to prevent duplicates
    constructor(address[] memory owners_, uint256 threshold_, uint256 chainId) {
        require(
            owners_.length <= 10 &&
            owners_.length > 1 &&
            threshold_ <= owners_.length &&
            threshold_ >= (owners_.length / 2) + 1 && // Round up integer division to get a threshold of more than (at least) half of total signer count
            threshold_ > 0, "threshold not allowed"
        );

        for (uint256 i = 0; i < owners_.length; i++) {
            require(owners_[i] != address(0), "owner address can not be zero address");
            require(!isOwner[owners_[i]], "duplicate owner");
            isOwner[owners_[i]] = true;
        }
        ownersArr = owners_;
        threshold = threshold_;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712DOMAINTYPE_HASH,
                NAME_HASH,
                VERSION_HASH,
                chainId,
                this,
                SALT
            )
        );
    }

    // Note that address recovered from signatures must be strictly increasing, in order to prevent duplicates
    function execute(
        uint8[] memory sigV,
        bytes32[] memory sigR,
        bytes32[] memory sigS,
        address destination,
        uint256 value,
        bytes memory data,
        address executor,
        uint256 gasLimit
    ) public {
        require(sigR.length >= threshold, "there are fewer signatures than the threshold");
        require(sigR.length == sigS.length && sigR.length == sigV.length, "signature arrays with different length");
        require(executor == msg.sender || executor == address(0), "sender is not the executor");
        require(isOwner[msg.sender], "sender is not an authorized signer");
        // EIP712 scheme: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md
        bytes32 txInputHash = keccak256(
            abi.encode(
                TXTYPE_HASH,
                destination,
                value,
                keccak256(data),
                nonce,
                executor,
                gasLimit
            )
        );
        bytes32 totalHash = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, txInputHash)
        );

        address lastAdd = address(0); // cannot have address(0) as an owner
        for (uint256 i = 0; i < threshold; i++) {
            address recovered = ecrecover(totalHash, sigV[i], sigR[i], sigS[i]);
            require(recovered > lastAdd && isOwner[recovered], "incorrect signature");
            lastAdd = recovered;
        }

        // If we make it here all signatures are accounted for.
        // The address.call() syntax is no longer recommended, see:
        // https://github.com/ethereum/solidity/issues/2884
        nonce = nonce + 1;
        bool success = false;
        assembly {
            success := call(
            gasLimit,
            destination,
            value,
            add(data, 0x20),
            mload(data),
            0,
            0
            )
        }
        require(success, "transaction was not executed");
    }
}
