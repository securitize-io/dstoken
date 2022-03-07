pragma solidity 0.5.17;

import "./VersionedContract.sol";
import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";
import "../zeppelin/math/Math.sol";
import "./TransactionRelayer.sol";

/**
 @dev Based on SimpleWallet (https://github.com/christianlundkvist/simple-multisig) and uses EIP-712 standard validate a signature
*/
contract TransactionRelayerUpdaterIneritance is TransactionRelayer {
    function setInvestorNonce (string memory investorId, uint256 newNonce) public {
        noncePerInvestor[toBytes332(investorId)] = newNonce;
    }

    function nonceByInvestor(string memory investorId) public view returns (uint256) {
        return noncePerInvestor[toBytes332(investorId)];
    }

    function toBytes332(string memory str) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(str));
    }
}