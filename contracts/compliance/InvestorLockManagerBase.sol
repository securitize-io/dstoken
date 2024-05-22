pragma solidity ^0.8.20;

import "../data-stores/InvestorLockManagerDataStore.sol";
import "../utils/BaseDSContract.sol";

//SPDX-License-Identifier: GPL-3.0
abstract contract InvestorLockManagerBase is IDSLockManager, InvestorLockManagerDataStore, BaseDSContract {
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
