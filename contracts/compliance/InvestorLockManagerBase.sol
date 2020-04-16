pragma solidity ^0.5.0;

import "../data-stores/InvestorLockManagerDataStore.sol";
import "../utils/ProxyTarget.sol";
import "../service/ServiceConsumer.sol";
import "../zeppelin/math/Math.sol";

contract InvestorLockManagerBase is ProxyTarget, Initializable, ServiceConsumer, InvestorLockManagerDataStore {
    event InvestorFullyLocked(string investorId);
    event InvestorFullyUnlocked(string investorId);

    function lockInvestor(string memory _investorId) public onlyIssuerOrAbove returns (bool) {
        require(!investorsLocked[_investorId], "Investor is already locked");
        investorsLocked[_investorId] = true;
        emit InvestorFullyLocked(_investorId);
        return true;
    }

    function unlockInvestor(string memory _investorId) public onlyIssuerOrAbove returns (bool) {
        require(investorsLocked[_investorId], "Investor is not locked");
        delete investorsLocked[_investorId];
        emit InvestorFullyUnlocked(_investorId);
        return true;
    }

    function isInvestorLocked(string memory _investorId) public view returns (bool) {
        return investorsLocked[_investorId];
    }
}
