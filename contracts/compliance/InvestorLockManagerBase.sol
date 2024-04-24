pragma solidity ^0.8.20;

import "../data-stores/InvestorLockManagerDataStore.sol";
import "../service/ServiceConsumer.sol";

//SPDX-License-Identifier: UNLICENSED
abstract contract InvestorLockManagerBase is IDSLockManager, ServiceConsumer, InvestorLockManagerDataStore {
    event InvestorFullyLocked(string investorId);
    event InvestorFullyUnlocked(string investorId);

    function initialize() public virtual override;

    function lockInvestor(string memory _investorId) public override onlyTransferAgentOrAbove returns (bool) {
        require(!investorsLocked[_investorId], "Investor is already locked");
        investorsLocked[_investorId] = true;
        emit InvestorFullyLocked(_investorId);
        return true;
    }

    function unlockInvestor(string memory _investorId) public override onlyTransferAgentOrAbove returns (bool) {
        require(investorsLocked[_investorId], "Investor is not locked");
        delete investorsLocked[_investorId];
        emit InvestorFullyUnlocked(_investorId);
        return true;
    }

    function isInvestorLocked(string memory _investorId) public override view returns (bool) {
        return investorsLocked[_investorId];
    }
}
