pragma solidity ^0.8.13;

import "./VersionedContract.sol";
import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 @dev Based on SimpleWallet (https://github.com/christianlundkvist/simple-multisig) and uses EIP-712 standard validate a signature
*/
//SPDX-License-Identifier: UNLICENSED
contract TransactionRelayer is ProxyTarget, Initializable, ServiceConsumer{
    // EIP712 Precomputed hashes:
    // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)")
    bytes32 constant EIP712DOMAINTYPE_HASH = 0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472;

    // keccak256("Securitize Transaction Relayer for pre-approved transactions")
    bytes32 constant NAME_HASH = 0x378460f4f89643d76dadb1d55fed95ff69d3c2e4b34cc81a5b565a797b10ce30;

    // keccak256("4")
    bytes32 constant VERSION_HASH = 0x13600b294191fc92924bb3ce4b969c1e7e2bab8f4c93c3fc6d0a51733df3c060;

    // keccak256("TransactionRelayer(address destination,uint256 value,bytes data,uint256 nonce,address executor,uint256 gasLimit)")
    bytes32 constant TXTYPE_HASH = 0x18352269123822ee0d5f7ae54168e303ddfc22d7bd1afb2feb38c21fffe27ea7;

    // keccak256("Securitize Transaction Relayer SALT")
    bytes32 constant SALT = 0x6e31104f5170e59a0a98ebdeb5ba99f8b32ef7b56786b1722f81a5fa19dd1629;

    uint256 public nonce; // (only) mutable state

    bytes32 DOMAIN_SEPARATOR; // hash for EIP712, computed from contract address

    uint256 public constant CONTRACT_VERSION = 4;

    mapping(bytes32 => uint256) internal noncePerInvestor;

    using SafeMath for uint256;

    event InvestorNonceUpdated(string investorId, uint256 newNonce);
    event DomainSeparatorUpdated(uint256 chainId);

    function initialize(uint256 chainId) public initializer forceInitializeFromProxy {
        ServiceConsumer.initialize();
        VERSIONS.push(CONTRACT_VERSION);

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
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        address destination,
        uint256 value,
        bytes memory data,
        address executor,
        uint256 gasLimit
    ) public {
        require(false, "not implemented");
    }

    // Note that address recovered from signatures must be strictly increasing, in order to prevent duplicates
    function executeByInvestor(
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        string memory senderInvestor,
        address destination,
        uint256 value,
        bytes memory data,
        address executor,
        uint256 gasLimit
    ) public {
        require(false, "not implemented");
    }

    /**
     * @dev Validates off-chain signatures and executes transaction.
     * @param sigV V signature
     * @param sigR R signature
     * @param sigR R signature
     * @param senderInvestor investor id created by registryService
     * @param destination address
     * @param data encoded transaction data. For example issue token
     * @param params array of params. params[0] = value, params[1] = gasLimit, params[2] = blockLimit
     */
    function executeByInvestorWithBlockLimit(
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        string memory senderInvestor,
        address destination,
        address executor,
        bytes memory data,
        uint256[] memory params
    ) public {
        require(params.length == 3, "Incorrect params length");
        require(params[2] >= block.number, "Transaction too old");
        doExecuteByInvestor(sigV, sigR, sigS, senderInvestor, destination, data, executor, params);
    }


    function nonceByInvestor(string memory investorId) public view returns (uint256) {
        return noncePerInvestor[toBytes32(investorId)];
    }

    function updateDomainSeparator(uint256 chainId) public onlyMaster {
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
        emit DomainSeparatorUpdated(chainId);
    }

    function setInvestorNonce(string memory investorId, uint256 newNonce) public onlyMaster {
        uint256 investorNonce = noncePerInvestor[toBytes32(investorId)];
        require(newNonce > investorNonce, "New nonce should be greater than old");
        noncePerInvestor[toBytes32(investorId)] = newNonce;
        emit InvestorNonceUpdated(investorId, newNonce);
    }

    function toBytes32(string memory str) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(str));
    }

    // Note that address recovered from signatures must be strictly increasing, in order to prevent duplicates
    function doExecuteByInvestor(
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        string memory senderInvestor,
        address destination,
        bytes memory data,
        address executor,
        uint256[] memory params
    ) private {
        // EIP712 scheme: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md
        bytes32 txInputHash = keccak256(
            abi.encode(
                TXTYPE_HASH,
                destination,
                params[0],
                keccak256(data),
                noncePerInvestor[toBytes32(senderInvestor)],
                executor,
                params[1],
                keccak256(abi.encodePacked(senderInvestor)),
                params[2]
            )
        );
        bytes32 totalHash = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, txInputHash)
        );

        address recovered = ecrecover(totalHash, sigV, sigR, sigS);
        // Check that the recovered address is an issuer
        uint256 approverRole = getTrustService().getRole(recovered);
        require(approverRole == ROLE_ISSUER || approverRole == ROLE_MASTER, 'Invalid signature');

        noncePerInvestor[toBytes32(senderInvestor)] = noncePerInvestor[toBytes32(senderInvestor)].add(1);
        bool success = false;
        uint256 value = params[0];
        uint256 gasLimit = params[1];
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

    fallback() external payable {}
}
