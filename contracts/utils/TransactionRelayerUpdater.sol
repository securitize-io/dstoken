pragma solidity 0.5.17;

import "./VersionedContract.sol";
import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";
import "../zeppelin/math/Math.sol";

/**
 @dev Based on SimpleWallet (https://github.com/christianlundkvist/simple-multisig) and uses EIP-712 standard validate a signature
*/
contract TransactionRelayerUpdater is ProxyTarget, Initializable, ServiceConsumer{
    uint256 public nonce; // (only) mutable state

    bytes32 DOMAIN_SEPARATOR; // hash for EIP712, computed from contract address

    mapping(bytes32 => uint256) internal noncePerInvestor;

    using SafeMath for uint256;

    event InvestorNonceUpdated(string investorId, uint256 newNonce);


    function nonceByInvestor(string memory investorId) public view returns (uint256) {
        return noncePerInvestor[toBytes32(investorId)];
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

    function() external payable {}
}
