pragma solidity 0.5.17;

import "./VersionedContract.sol";
import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";
import "../zeppelin/math/Math.sol";

/**
 @dev Based on SimpleWallet (https://github.com/christianlundkvist/simple-multisig) and uses EIP-712 standard validate a signature
*/
contract TransactionRelayer is ProxyTarget, Initializable, ServiceConsumer{
    // EIP712 Precomputed hashes:
    // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)")
    bytes32 constant EIP712DOMAINTYPE_HASH = 0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472;

    // keccak256("Securitize Transaction Relayer for pre-approved transactions")
    bytes32 constant NAME_HASH = 0x378460f4f89643d76dadb1d55fed95ff69d3c2e4b34cc81a5b565a797b10ce30;

    // keccak256("3")
    bytes32 constant VERSION_HASH = 0x2a80e1ef1d7842f27f2e6be0972bb708b9a135c38860dbe73c27c3486c34f4de;

    // keccak256("TransactionRelayer(address destination,uint256 value,bytes data,uint256 nonce,address executor,uint256 gasLimit)")
    bytes32 constant TXTYPE_HASH = 0x18352269123822ee0d5f7ae54168e303ddfc22d7bd1afb2feb38c21fffe27ea7;

    // keccak256("Securitize Transaction Relayer SALT")
    bytes32 constant SALT = 0x6e31104f5170e59a0a98ebdeb5ba99f8b32ef7b56786b1722f81a5fa19dd1629;

    uint256 public nonce; // (only) mutable state

    bytes32 DOMAIN_SEPARATOR; // hash for EIP712, computed from contract address

    uint256 public constant CONTRACT_VERSION = 3;

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

        address recovered = ecrecover(totalHash, sigV, sigR, sigS);
        // Check that the recovered address is an issuer
        uint256 approverRole = getTrustService().getRole(recovered);
        require(approverRole == ROLE_ISSUER || approverRole == ROLE_MASTER, 'Invalid signature');

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
        uint256 investorNonce = noncePerInvestor[toBytes32(senderInvestor)];
        // EIP712 scheme: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md
        bytes32 txInputHash = keccak256(
            abi.encode(
                TXTYPE_HASH,
                destination,
                value,
                keccak256(data),
                investorNonce,
                executor,
                gasLimit
            )
        );
        bytes32 totalHash = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, txInputHash)
        );

        address recovered = ecrecover(totalHash, sigV, sigR, sigS);
        // Check that the recovered address is an issuer
        uint256 approverRole = getTrustService().getRole(recovered);
        require(approverRole == ROLE_ISSUER || approverRole == ROLE_MASTER, 'Invalid signature');

        // The address.call() syntax is no longer recommended, see:
        // https://github.com/ethereum/solidity/issues/2884
        investorNonce = investorNonce.add(1);
        noncePerInvestor[toBytes32(senderInvestor)] = investorNonce;
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

    function setInvestorNonce(string memory investorId, uint256 newNonce) public onlyIssuerOrAbove {
        uint256 investorNonce = noncePerInvestor[toBytes32(investorId)];
        require(newNonce > investorNonce, "New nonce should be greater than old");
        noncePerInvestor[toBytes32(investorId)] = newNonce;
        emit InvestorNonceUpdated(investorId, newNonce);
    }

    function toBytes32(string memory str) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(str));
    }

    function() external payable {}
}
